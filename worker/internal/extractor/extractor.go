// Package extractor handles safe extraction of zip archives.
// Security guarantees:
//   - Path traversal prevention (../../ etc.)
//   - Absolute path rejection
//   - Per-file and total size caps
//   - Max file count cap
//   - Symlink rejection inside the archive
//   - Common single top-level prefix stripping (e.g. dist/, build/)
package extractor

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const (
	MaxFiles     = 2_000
	MaxFileBytes = 50 * 1024 * 1024  // 50 MB per file
	MaxTotalBytes = 200 * 1024 * 1024 // 200 MB total extracted
)

// Extract unpacks zipPath into targetDir.
// Returns an error describing exactly what went wrong.
func Extract(zipPath, targetDir string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("cannot open zip: %w", err)
	}
	defer r.Close()

	if len(r.File) == 0 {
		return fmt.Errorf("archive is empty")
	}
	if len(r.File) > MaxFiles {
		return fmt.Errorf("archive contains %d files (max %d)", len(r.File), MaxFiles)
	}

	// Strip common single top-level directory prefix so both:
	//   mysite/index.html   and   index.html
	// end up at targetDir/index.html.
	prefix := commonPrefix(r.File)

	var totalBytes int64

	for _, f := range r.File {
		relPath, err := safePath(f.Name, prefix, targetDir)
		if err != nil {
			return fmt.Errorf("unsafe path in archive (%q): %w", f.Name, err)
		}
		if relPath == "" {
			continue // was the prefix directory itself
		}

		// Reject symlinks inside the archive
		if f.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("archive contains symlink %q — not allowed", f.Name)
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(filepath.Join(targetDir, relPath), 0o755); err != nil {
				return fmt.Errorf("mkdir %q: %w", relPath, err)
			}
			continue
		}

		// Size checks
		if f.UncompressedSize64 > MaxFileBytes {
			return fmt.Errorf("file %q is too large (%d bytes, max %d)", f.Name, f.UncompressedSize64, MaxFileBytes)
		}
		totalBytes += int64(f.UncompressedSize64)
		if totalBytes > MaxTotalBytes {
			return fmt.Errorf("archive total uncompressed size exceeds %d MB", MaxTotalBytes/1024/1024)
		}

		if err := writeFile(f, filepath.Join(targetDir, relPath)); err != nil {
			return fmt.Errorf("extract %q: %w", f.Name, err)
		}
	}

	return nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// safePath resolves a zip entry name to a clean relative path inside targetDir.
// Returns ("", nil) for the prefix directory itself (skip it).
// Returns an error for any path that would escape targetDir.
func safePath(name, prefix, targetDir string) (string, error) {
	// Strip common prefix
	rel := strings.TrimPrefix(name, prefix)
	if rel == "" || rel == "." || rel == "/" {
		return "", nil
	}

	// filepath.Clean collapses .. and resolves .
	clean := filepath.Clean(rel)

	// Must not start with .. and must not be absolute
	if filepath.IsAbs(clean) {
		return "", fmt.Errorf("absolute path")
	}
	if clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("path traversal")
	}

	// Double-check with a full join: the joined path must be inside targetDir
	full := filepath.Join(targetDir, clean)
	if !strings.HasPrefix(full+string(filepath.Separator), filepath.Clean(targetDir)+string(filepath.Separator)) {
		return "", fmt.Errorf("escapes target directory")
	}

	return clean, nil
}

// commonPrefix returns the single top-level directory name (with trailing slash)
// if every entry shares it, otherwise "".
func commonPrefix(files []*zip.File) string {
	if len(files) == 0 {
		return ""
	}

	// Get the first path component of the first file
	parts := strings.SplitN(files[0].Name, "/", 2)
	if len(parts) < 2 || parts[1] == "" {
		return "" // first file is already at root
	}
	candidate := parts[0] + "/"

	for _, f := range files {
		if !strings.HasPrefix(f.Name, candidate) {
			return "" // at least one file not under the prefix
		}
	}

	return candidate
}

// writeFile extracts one zip entry to destPath, creating parent dirs as needed.
func writeFile(f *zip.File, destPath string) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
		return err
	}

	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	// Use an explicit size limit reader to guard against zip bombs
	limited := io.LimitReader(rc, MaxFileBytes+1)

	out, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, f.Mode().Perm())
	if err != nil {
		return err
	}
	defer out.Close()

	written, err := io.Copy(out, limited)
	if err != nil {
		return err
	}
	if written > MaxFileBytes {
		return fmt.Errorf("file exceeded size limit during write (%d bytes)", written)
	}

	return nil
}

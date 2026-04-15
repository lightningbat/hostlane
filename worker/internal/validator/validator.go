// Package validator checks an extracted deploy directory for correctness.
// Rules (phase 1):
//   - targetDir must exist and be non-empty
//   - index.html must be present at the root
//   - No dangerous file types (.php, .exe, server-side scripts)
package validator

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// blockedExtensions are file types that should never appear in a
// static-site build. Reject early rather than serve them accidentally.
var blockedExtensions = map[string]bool{
	".php":   true,
	".phtml": true,
	".php3":  true,
	".php4":  true,
	".php5":  true,
	".phar":  true,
	".exe":   true,
	".dll":   true,
	".so":    true,
	".sh":    true,
	".bash":  true,
	".zsh":   true,
	".ps1":   true,
	".bat":   true,
	".cmd":   true,
	".py":    true,
	".rb":    true,
	".pl":    true,
}

// Validate checks that targetDir contains a valid static-site build.
func Validate(targetDir string) error {
	// 1. Directory must exist
	info, err := os.Stat(targetDir)
	if err != nil {
		return fmt.Errorf("deploy directory does not exist: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("deploy path is not a directory")
	}

	// 2. Directory must not be empty
	entries, err := os.ReadDir(targetDir)
	if err != nil {
		return fmt.Errorf("cannot read deploy directory: %w", err)
	}
	if len(entries) == 0 {
		return fmt.Errorf("deploy directory is empty after extraction")
	}

	// 3. index.html must exist at root
	indexPath := filepath.Join(targetDir, "index.html")
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		return fmt.Errorf("index.html not found at the root of the archive")
	}

	// 4. Walk tree and reject blocked file types
	if err := walkAndCheck(targetDir); err != nil {
		return err
	}

	return nil
}

func walkAndCheck(root string) error {
	return filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(d.Name()))
		if blockedExtensions[ext] {
			rel, _ := filepath.Rel(root, path)
			return fmt.Errorf("file type not allowed in static builds: %q", rel)
		}

		return nil
	})
}

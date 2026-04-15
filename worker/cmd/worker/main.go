// Hostlane deploy worker.
//
// Lifecycle:
//  1. Read one WorkerJob JSON line from stdin.
//  2. Run the pipeline: extract → validate.
//  3. Emit stage updates and a final result to stdout as newline-delimited JSON.
//  4. Exit 0 on success, 1 on any fatal error (Node detects this via child exit event).
//
// All diagnostic/debug output goes to stderr — Node never reads it.
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"

	"github.com/lightningbat/hostlane/worker/internal/extractor"
	"github.com/lightningbat/hostlane/worker/internal/ipc"
	"github.com/lightningbat/hostlane/worker/internal/validator"
)

func main() {
	job, err := readJob()
	if err != nil {
		// Can't even parse the job — nothing useful to send back, just die
		fmt.Fprintf(os.Stderr, "[worker] failed to read job: %v\n", err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "[worker] starting deployment %s (site %d)\n", job.DeploymentID, job.SiteID)

	if err := run(job); err != nil {
		// run() already sent the failure result to stdout before returning
		fmt.Fprintf(os.Stderr, "[worker] deployment %s failed: %v\n", job.DeploymentID, err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "[worker] deployment %s completed successfully\n", job.DeploymentID)
	os.Exit(0)
}

// run executes the full deployment pipeline, reporting progress and result
// over stdout via ipc.Stdout. It returns the first error encountered.
func run(job *ipc.WorkerJob) error {
	// ── STEP 1: Create the target directory ──────────────────────────────────
	if err := os.MkdirAll(job.TargetDir, 0o755); err != nil {
		ipc.Stdout.SendFailure(job.DeploymentID, ipc.StageExtracting,
			fmt.Errorf("could not create deploy directory: %w", err))
		return err
	}

	// ── STEP 2: Extract zip ──────────────────────────────────────────────────
	ipc.Stdout.SendStage(job.DeploymentID, ipc.StageExtracting)
	fmt.Fprintf(os.Stderr, "[worker] extracting %s → %s\n", job.ZipPath, job.TargetDir)

	if err := extractor.Extract(job.ZipPath, job.TargetDir); err != nil {
		ipc.Stdout.SendFailure(job.DeploymentID, ipc.StageExtracting, err)
		return err
	}
	fmt.Fprintf(os.Stderr, "[worker] extraction complete\n")

	// ── STEP 3: Validate extracted build ────────────────────────────────────
	ipc.Stdout.SendStage(job.DeploymentID, ipc.StageValidating)
	fmt.Fprintf(os.Stderr, "[worker] validating %s\n", job.TargetDir)

	if err := validator.Validate(job.TargetDir); err != nil {
		ipc.Stdout.SendFailure(job.DeploymentID, ipc.StageValidating, err)
		return err
	}
	fmt.Fprintf(os.Stderr, "[worker] validation passed\n")

	// ── STEP 4: Report success ───────────────────────────────────────────────
	// Node will handle the symlink swap and DB promotion from here.
	ipc.Stdout.SendSuccess(job.DeploymentID)
	return nil
}

// readJob reads exactly one JSON line from stdin.
func readJob() (*ipc.WorkerJob, error) {
	scanner := bufio.NewScanner(os.Stdin)
	// Allow up to 1 MB for the job line (paths can be long)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	if !scanner.Scan() {
		if err := scanner.Err(); err != nil {
			return nil, fmt.Errorf("stdin read error: %w", err)
		}
		return nil, fmt.Errorf("stdin closed without a job")
	}

	var job ipc.WorkerJob
	if err := json.Unmarshal(scanner.Bytes(), &job); err != nil {
		return nil, fmt.Errorf("invalid job JSON: %w", err)
	}

	if err := validateJob(&job); err != nil {
		return nil, err
	}

	return &job, nil
}

// validateJob checks that all required fields are present.
func validateJob(job *ipc.WorkerJob) error {
	if job.DeploymentID == "" {
		return fmt.Errorf("deployment_id must be > 0")
	}
	if job.SiteID <= 0 {
		return fmt.Errorf("site_id must be > 0")
	}
	if job.ZipPath == "" {
		return fmt.Errorf("zip_path is required")
	}
	if job.TargetDir == "" {
		return fmt.Errorf("target_dir is required")
	}

	// zip must actually exist before we start
	if _, err := os.Stat(job.ZipPath); err != nil {
		return fmt.Errorf("zip_path %q: %w", job.ZipPath, err)
	}

	return nil
}

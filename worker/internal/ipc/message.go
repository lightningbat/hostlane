// Package ipc defines the JSON message types used for communication
// between the Node.js parent process and this Go worker over stdin/stdout.
//
// Protocol:
//   - Parent sends ONE WorkerJob line on stdin, then closes stdin.
//   - Worker writes WorkerMessage lines to stdout as it progresses.
//   - Worker writes diagnostic logs to stderr (never read by Node).
package ipc

// ─── Inbound (Node → Worker) ─────────────────────────────────────────────────

// WorkerJob is the single job sent by the Node parent on stdin.
type WorkerJob struct {
	DeploymentID string`json:"deployment_id"`
	SiteID       int    `json:"site_id"`
	ZipPath      string `json:"zip_path"`
	TargetDir    string `json:"target_dir"`
}

// ─── Outbound (Worker → Node) ────────────────────────────────────────────────

// MessageType distinguishes the two kinds of outbound messages.
type MessageType string

const (
	TypeStage  MessageType = "stage"
	TypeResult MessageType = "result"
)

// StageUpdate is emitted when the worker moves to a new pipeline stage.
// Node uses this to update the deployment status in the DB and push an SSE event.
type StageUpdate struct {
	Type         MessageType `json:"type"`           // always "stage"
	DeploymentID string`json:"deployment_id"`
	Stage        Stage       `json:"stage"`
}

// Result is the final message. Exactly one per job, always last.
type Result struct {
	Type         MessageType `json:"type"`                      // always "result"
	DeploymentID string`json:"deployment_id"`
	Success      bool        `json:"result_ok"`                 // true = success
	Error        string      `json:"error,omitempty"`
	FailedStage  Stage       `json:"failed_stage,omitempty"`
}

// ─── Stage enum ──────────────────────────────────────────────────────────────

type Stage string

const (
	StageExtracting Stage = "EXTRACTING"
	StageValidating Stage = "VALIDATING"
)

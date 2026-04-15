package ipc

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// Writer sends newline-delimited JSON to stdout in a goroutine-safe way.
// (Not needed for single-goroutine workers, but good practice.)
type Writer struct {
	mu sync.Mutex
}

var Stdout = &Writer{}

func (w *Writer) send(v any) {
	w.mu.Lock()
	defer w.mu.Unlock()

	b, err := json.Marshal(v)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[ipc] marshal error: %v\n", err)
		return
	}
	fmt.Fprintf(os.Stdout, "%s\n", b)
}

// SendStage emits a stage-update message to the Node parent.
func (w *Writer) SendStage(deploymentID string, stage Stage) {
	w.send(StageUpdate{
		Type:         TypeStage,
		DeploymentID: deploymentID,
		Stage:        stage,
	})
}

// SendSuccess emits the final success result.
func (w *Writer) SendSuccess(deploymentID string) {
	w.send(Result{
		Type:         TypeResult,
		DeploymentID: deploymentID,
		Success:      true,
	})
}

// SendFailure emits the final failure result.
func (w *Writer) SendFailure(deploymentID string, stage Stage, err error) {
	w.send(Result{
		Type:         TypeResult,
		DeploymentID: deploymentID,
		Success:      false,
		Error:        err.Error(),
		FailedStage:  stage,
	})
}

"use client";

/**
 * Owns the client's local optimistic projection of server-loaded board data.
 * The incoming board remains the base snapshot; this hook overlays pending moves
 * rather than maintaining a second authoritative copy of persisted records.
 * Client checks here are UI conveniences, not validation or access control:
 * authentication, ownership, input validation, and transaction guarantees must
 * be enforced on the server independently of this projection.
 */

import { useOptimistic, useState, useTransition } from "react";
import type { Board, Column } from "../models/models.types";
import { updateJobApplication } from "../actions/job-applications";

interface JobMove {
  jobApplicationId: string;
  newColumnId: string;
  newOrder: number;
}

/**
 * Projects pending moves over the supplied board (or an empty column list).
 * Returns the displayed columns, the latest move error, and the move operation.
 * Fresh server-loaded props supply reconciliation; no manual snapshot rollback
 * or local persistence is performed by this hook.
 */
export function useBoard(initialBoard?: Board | null) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [columns, applyMove] = useOptimistic(
    initialBoard?.columns || [],
    (previousColumns: Column[], move: JobMove) => {
      const { jobApplicationId, newColumnId, newOrder } = move;
      const jobToMove = previousColumns
        .flatMap((column) => column.jobApplications)
        .find((job) => job._id === jobApplicationId);

      // Ignore moves this snapshot cannot represent; this is not proof that a
      // request is valid or authorized, and it does not prevent the server call.
      if (!jobToMove || !previousColumns.some((col) => col._id === newColumnId)) {
        return previousColumns;
      }

      // Remove the card from every column before inserting it once. filter
      // creates fresh arrays, so sorting/splicing below cannot mutate props or
      // the base snapshot that React needs when the optimistic overlay expires.
      return previousColumns.map((column) => {
        const jobs = column.jobApplications.filter(
          (job) => job._id !== jobApplicationId
        );

        if (column._id === newColumnId) {
          // newOrder is an insertion index, not the stored order value. Sort
          // first, then project destination order as 0, 100, 200, ...; other
          // columns retain their remaining cards' order values. Clone destination
          // cards before changing order/columnId to preserve shared input objects.
          jobs.sort((a, b) => a.order - b.order);
          jobs.splice(newOrder, 0, { ...jobToMove, columnId: newColumnId });
          return {
            ...column,
            jobApplications: jobs.map((job, index) => ({
              ...job,
              order: index * 100,
            })),
          };
        }

        return { ...column, jobApplications: jobs };
      });
    }
  );

  /**
   * Displays a move immediately while the Server Action persists it.
   * @param jobApplicationId Card to move in the current projection.
   * @param newColumnId Destination column identifier.
   * @param newOrder Zero-based insertion index after removing the moving card.
   *
   * Starts a transition and returns immediately, not a persistence promise.
   * A new attempt clears the prior error; server-reported rejection and thrown
   * failures are exposed through `error` for the caller to render. React removes
   * the pending overlay when the transition settles, using the current base
   * props; this is not an explicit inverse move or a database rollback.
   */
  function moveJob(
    jobApplicationId: string,
    newColumnId: string,
    newOrder: number
  ) {
    setError(null);
    startTransition(async () => {
      // Queue the projection before awaiting network work so dragging feels
      // immediate. Only the server result determines whether persistence worked.
      applyMove({ jobApplicationId, newColumnId, newOrder });
      try {
        const result = await updateJobApplication(jobApplicationId, {
          columnId: newColumnId,
          order: newOrder,
        });
        if (result.error) {
          setError(`Failed to move job application: ${result.error}`);
        }
      } catch {
        setError("Failed to move job application. Please try again.");
      }
    });
  }

  return { columns, error, moveJob };
}

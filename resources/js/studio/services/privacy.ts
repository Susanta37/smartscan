// This registry contains only temporary in-memory resources, never customer data in storage.
const cleanupTasks = new Set<() => void>();
export function trackTemporary(cleanup: () => void) {
    cleanupTasks.add(cleanup);
    return () => {
        cleanupTasks.delete(cleanup);
        cleanup();
    };
}
export function releaseTemporaryResources() {
    for (const cleanup of cleanupTasks) cleanup();
    cleanupTasks.clear();
}

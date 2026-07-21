const PRIVILEGED_PORT_MAX = 1023;

export function isPrivilegedPort(port: number): boolean {
  return port >= 1 && port <= PRIVILEGED_PORT_MAX;
}

export function privilegedPortMessage(port: number): string {
  return (
    `Port ${port} requires elevated privileges on Unix. ` +
    "Run with sudo, grant cap_net_bind_service to node (Linux/Docker), " +
    "or bind a higher port and forward external traffic (pfctl/iptables)."
  );
}

export function wrapListenError(error: unknown, port: number): Error {
  const errno = error as NodeJS.ErrnoException;

  if (errno.code === "EACCES" && isPrivilegedPort(port)) {
    return new Error(privilegedPortMessage(port), { cause: error });
  }

  return error instanceof Error ? error : new Error(String(error));
}

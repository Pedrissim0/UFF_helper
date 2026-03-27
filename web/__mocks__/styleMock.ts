const styleMock: Record<string, string> = new Proxy(
  {},
  { get: (_target, prop) => String(prop) }
);
export default styleMock;

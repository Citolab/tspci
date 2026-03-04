declare module "*.css" {
  const content: string;
  export = content;
}

declare module "*.png" {
  const content: string;
  export = content;
}
declare module "qtiCustomInteractionContext" {
  const register: {register: (PortableInteraction) => void};
  export = register;
}
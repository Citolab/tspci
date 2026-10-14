// Imports the build bundles into the PCI (see the readme): CSS as a string, images as a data URL.
declare module "*.css" {
  const content: string;
  export = content;
}
declare module "*.png" {
  const content: string;
  export = content;
}
declare module "*.jpg" {
  const content: string;
  export = content;
}
declare module "*.svg" {
  const content: string;
  export = content;
}

// Provided by the delivery engine at runtime.
declare module "qtiCustomInteractionContext" {
  const register: {register: (PortableInteraction) => void};
  export = register;
}

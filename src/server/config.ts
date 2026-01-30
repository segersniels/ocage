export interface Config {
  port: number;
  autoOpen: boolean;
}

export function getConfig(): Config {
  return {
    port: parseInt(process.env.PORT || "3333", 10),
    autoOpen: process.env.NO_OPEN !== "1",
  };
}

import "@clerk/types";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "admin"
    };
  }
}

export {};
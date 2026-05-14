declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email: string;
        nume: string;
      } | null;
    }
  }
}
export {};

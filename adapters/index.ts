import { bilkentAdapter } from "./bilkent";
import { ucrAdapter } from "./ucr";

// Import and add new partner adapters here to expose them in the UI dropdown.
export const availableAdapters = [bilkentAdapter, ucrAdapter];

import config from "./config.json";
import mappings from "./mappings.json";
import offerings from "./offerings.json";

export const ucrAdapter = {
  config,
  mappings,
  offerings: { [config.term.code]: offerings },
};

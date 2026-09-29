const SHARED_STORAGE_MODE = "pi-shared-localstorage";
const NATIVE_STORAGE_MODE = "caracal-native";

const SHARED_STORAGE_PATH = "./localStorage/caraGarage.jsonl";
const SHARED_STORAGE_ROTA_PATH = "./localStorage/caraGarage.other.jsonl";
const NATIVE_STORAGE_PATH = "./localStorage/caracAL-native.jsonl";
const NATIVE_STORAGE_ROTA_PATH = "./localStorage/caracAL-native.other.jsonl";

function parse_boolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function resolve_storage_mode(config = {}, environment = process.env) {
  if (Object.prototype.hasOwnProperty.call(config, "use_pi_shared_local_storage")) {
    return config.use_pi_shared_local_storage === false
      ? NATIVE_STORAGE_MODE
      : SHARED_STORAGE_MODE;
  }

  const from_environment = parse_boolean(
    environment && environment.CARACAL_USE_PI_SHARED_LOCAL_STORAGE,
  );
  return from_environment === false ? NATIVE_STORAGE_MODE : SHARED_STORAGE_MODE;
}

function storage_paths(storage_mode) {
  if (storage_mode === SHARED_STORAGE_MODE) {
    return {
      main: SHARED_STORAGE_PATH,
      rotation: SHARED_STORAGE_ROTA_PATH,
    };
  }
  return {
    main: NATIVE_STORAGE_PATH,
    rotation: NATIVE_STORAGE_ROTA_PATH,
  };
}

function is_pi_shared_storage(storage_mode) {
  return storage_mode === SHARED_STORAGE_MODE;
}

module.exports = {
  SHARED_STORAGE_MODE,
  NATIVE_STORAGE_MODE,
  storage_paths,
  resolve_storage_mode,
  is_pi_shared_storage,
};

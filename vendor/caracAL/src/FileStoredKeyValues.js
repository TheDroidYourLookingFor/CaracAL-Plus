const fs = require("node:fs");
const path = require("node:path");
const { entries } = Object;

class FileStoredKeyValues {
  static #LOCK_STALE_MS = 120000;
  static #LOCK_RETRY_MS = 5;
  // A restart can briefly overlap the previous CaracAL process while its
  // storage refactor exits. Waiting longer than the old 30-second cap lets a
  // real owner finish and gives a crashed owner time to become stale instead
  // of terminating the whole headless service during startup.
  static #LOCK_WAIT_MS = 180000;
  #main_path;
  #replacer_path;
  #lock_path;
  #backend;
  #main_signature;
  #refactorTask;

  constructor(
    main_path = "garage.jsonl",
    replacer_path = "garage.new.jsonl",
    refactor_interval = 30e3,
  ) {
    if (main_path === replacer_path) {
      throw new Error(
        `Please choose different main path and replacer path: ${main_path}`,
      );
    }
    this.#main_path = main_path;
    this.#replacer_path = replacer_path;
    this.#lock_path = `${replacer_path}.lock`;
    this.#backend = new Map();
    this.#main_signature = null;
    this.#initializeStore();
    this.#refactorTask = setInterval(() => this.refactor(), refactor_interval);
    this.refactor();
  }

  #checkFileExistence(path) {
    let handle = null;
    try {
      handle = fs.openSync(path, "r");
    } catch (err) {
      return false;
    } finally {
      if (handle !== null) {
        fs.closeSync(handle);
      }
    }
    return true;
  }

  #readFromDisk() {
    this.#backend.clear();
    if (!this.#checkFileExistence(this.#main_path)) {
      this.#main_signature = null;
      return;
    }
    const contents = fs.readFileSync(this.#main_path, "utf8");
    for (const line of contents.split("\n")) {
      if (!line.length) continue;
      const [key, value] = entries(JSON.parse(line))[0];
      if (value === null) this.#backend.delete(key);
      else this.#backend.set(key, value);
    }
    this.#main_signature = this.#readMainSignature();
  }

  #readMainSignature() {
    try {
      const stat = fs.statSync(this.#main_path);
      return `${stat.ino}:${stat.size}:${stat.mtimeMs}`;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  #refreshFromDiskIfChanged() {
    if (this.#readMainSignature() !== this.#main_signature) this.#readFromDisk();
  }

  #acquireLock() {
    const directory = path.dirname(this.#lock_path);
    fs.mkdirSync(directory, { recursive: true });
    for (let attempt = 0; attempt < FileStoredKeyValues.#LOCK_WAIT_MS / FileStoredKeyValues.#LOCK_RETRY_MS; attempt += 1) {
      try {
        return fs.openSync(this.#lock_path, "wx", 0o600);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        try {
          const lock = fs.statSync(this.#lock_path);
          if (Date.now() - lock.mtimeMs > FileStoredKeyValues.#LOCK_STALE_MS) {
            fs.unlinkSync(this.#lock_path);
            continue;
          }
        } catch (lockError) {
          if (lockError.code !== "ENOENT") throw lockError;
          continue;
        }
        // This is a synchronous storage API. A short kernel-backed wait keeps
        // the two CaracAL processes from racing without introducing a second
        // async contract for every localStorage write.
        Atomics.wait(
          new Int32Array(new SharedArrayBuffer(4)),
          0,
          0,
          FileStoredKeyValues.#LOCK_RETRY_MS,
        );
      }
    }
    throw new Error(`Timed out waiting for storage lock: ${this.#lock_path}`);
  }

  #releaseLock(handle) {
    try {
      fs.closeSync(handle);
    } finally {
      try {
        fs.unlinkSync(this.#lock_path);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }

  #withLock(callback) {
    const lockHandle = this.#acquireLock();
    try {
      return callback();
    } finally {
      this.#releaseLock(lockHandle);
    }
  }

  #initializeStore() {
    this.#withLock(() => {
      if (
        this.#checkFileExistence(this.#replacer_path) &&
        !this.#checkFileExistence(this.#main_path)
      ) {
        fs.renameSync(this.#replacer_path, this.#main_path);
      }
      if (!this.#checkFileExistence(this.#main_path)) {
        fs.mkdirSync(path.dirname(this.#main_path), { recursive: true });
        fs.writeFileSync(this.#main_path, "", { encoding: "utf8" });
      }
      this.#readFromDisk();
    });
  }

  refactor() {
    // Both the headless and browser-client processes use this class. Reload
    // the current append-only log while holding the lock, otherwise a stale
    // process can refactor its private map over records written by the other
    // process (for example MerchantConfigUI settings).
    this.#withLock(() => {
      if (
        this.#checkFileExistence(this.#replacer_path) &&
        !this.#checkFileExistence(this.#main_path)
      ) {
        fs.renameSync(this.#replacer_path, this.#main_path);
      }
      if (!this.#checkFileExistence(this.#main_path)) {
        fs.mkdirSync(path.dirname(this.#main_path), { recursive: true });
        fs.writeFileSync(this.#main_path, "", { encoding: "utf8" });
      }
      this.#readFromDisk();
      const k_v_list = [];
      for (const [key, value] of this.#backend.entries()) {
        k_v_list.push(JSON.stringify({ [key]: value }) + "\n");
      }
      fs.writeFileSync(this.#replacer_path, k_v_list.join(""), {
        encoding: "utf8",
      });
      try {
        fs.renameSync(this.#replacer_path, this.#main_path);
      } catch (error) {
        // Linux replaces atomically; Windows does not replace an existing
        // destination. The lock keeps this fallback safe on both platforms.
        if (!(["EEXIST", "EPERM", "ENOTEMPTY"].includes(error.code))) throw error;
        fs.unlinkSync(this.#main_path);
        fs.renameSync(this.#replacer_path, this.#main_path);
      }
      this.#main_signature = this.#readMainSignature();
    });
  }

  close() {
    clearInterval(this.#refactorTask);
  }

  //i dont guarantee functionality if you set values that are not strings
  set(key, value) {
    return this.#withLock(() => {
      this.#refreshFromDiskIfChanged();
      if (this.#backend.get(key) !== value) {
        fs.appendFileSync(this.#main_path, JSON.stringify({ [key]: value }) + "\n", {
          encoding: "utf8",
        });
        this.#backend.set(key, value);
        this.#main_signature = this.#readMainSignature();
      }
      return this;
    });
  }

  delete(key) {
    return this.#withLock(() => {
      this.#refreshFromDiskIfChanged();
      fs.appendFileSync(this.#main_path, JSON.stringify({ [key]: null }) + "\n", {
        encoding: "utf8",
      });
      this.#backend.delete(key);
      this.#main_signature = this.#readMainSignature();
      return this;
    });
  }

  clear() {
    return this.#withLock(() => {
      this.#refreshFromDiskIfChanged();
      const tombstones = Array.from(this.#backend.keys(), (key) =>
        JSON.stringify({ [key]: null }),
      );
      if (tombstones.length) {
        fs.appendFileSync(this.#main_path, tombstones.join("\n") + "\n", {
          encoding: "utf8",
        });
      }
      this.#backend.clear();
      this.#main_signature = this.#readMainSignature();
      return this;
    });
  }

  get(key) {
    return this.#backend.get(key);
  }

  entries() {
    return this.#backend.entries();
  }
}

module.exports = FileStoredKeyValues;

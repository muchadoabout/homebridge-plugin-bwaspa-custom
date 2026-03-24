<p align="center">
<img src="https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png" width="150">
</p>

# Homebridge Balboa Spa (Custom Fork)

This is a fork of [homebridge-plugin-bwaspa](https://github.com/vincedarley/homebridge-plugin-bwaspa) by [@vincedarley](https://github.com/vincedarley), focused on improving connection reliability and stability.

For setup instructions, configuration, supported accessories, and general usage, see the [original plugin documentation](https://github.com/vincedarley/homebridge-plugin-bwaspa#readme).

## Why this fork exists

The original plugin works well in most situations, but on my setup the spa accessories would show "No Response" in HomeKit every 1-2 days. The only fix was a full Homebridge restart. After tracing through the logs and source code, I identified several root causes related to connection handling, error recovery, and how the plugin communicates with HomeKit.

The full diagnosis and test results are documented in [this upstream issue](https://github.com/vincedarley/homebridge-plugin-bwaspa/issues/31).

## Status

Currently testing on my own Homebridge instance. Results so far have been positive -- the plugin now self-recovers from connection drops, Wi-Fi outages, and IP changes without requiring a Homebridge restart.

If stability holds up, I plan to reach out to the original plugin owner to discuss either contributing these changes back via a PR or keeping this as a standalone fork. The original author has mentioned plans for a Homebridge 2.0 / Matter rewrite, so these fixes may also serve as a reference for that effort.

## What's new in this fork

This fork adds a configurable log level in the Homebridge plugin settings UI (Minimal / Normal / Verbose), so you can control how much the plugin logs without editing code.

## Changelog

### v1.0.6 -- Fix thermostat "No Response" and temperature display

- **Hold last known temperature when spa reports 0xFF.** The spa periodically sends 255 (0xFF) as the current temperature to indicate "no fresh reading" (common during priming and normal operation). Previously this set the temperature to `undefined`, which cascaded into other issues. Now the last valid temperature is preserved through these gaps.
- **Fix thermostat "No Response" in HomeKit.** Returning an `Error` from GET handlers (introduced in v1.0.4) caused HomeKit to mark the thermostat as permanently unresponsive. GET handlers now return `null` when a value isn't available yet, which lets HomeKit use its cached value until a real reading arrives (typically within 1-2 seconds of connection).
- **Fix state change log always triggering on "Normal" log level.** The change detection was comparing the full state string which includes the spa's clock time, so it always detected a "change" every 15 minutes. Change detection now ignores the clock and only logs when meaningful state changes (temperature, pumps, heating, etc.).

### v1.0.5 -- Logging, parser fixes, and polish

- **Configurable log level.** New "Log Level" setting in the Homebridge plugin UI:
  - *Minimal* -- errors and warnings only (quietest)
  - *Normal* (default) -- logs connection events and state only when something changes
  - *Verbose* -- logs full spa state every 15 minutes (original behavior, useful for troubleshooting)
- **Parser re-sync on corrupt data.** When the message parser receives corrupted data, it now scans forward to the next valid message boundary instead of cascading into dozens of error log lines.
- **Wi-Fi channel hint.** On the first checksum or corruption error, a one-time tip is logged suggesting the user try a different 2.4 GHz Wi-Fi channel (a common fix per [issue #26](https://github.com/vincedarley/homebridge-plugin-bwaspa/issues/26)).
- **Discovery interval leak fix.** Repeated re-discovery calls no longer accumulate UDP broadcast intervals.
- **Temperature update guard fix.** Changed a falsy check to a proper null check so a 0-degree reading would not be incorrectly skipped.

### v1.0.4 -- Null temperature fix

- **Reduce "illegal value: null" warnings.** When the spa hasn't reported its temperature, `updateValue` calls are now skipped for unknown temps, reducing repeated warnings in the Homebridge log.

### v1.0.3 -- Socket connect timeout and parallel re-discovery

- **30-second socket connect timeout.** Prevents the plugin from hanging indefinitely when the spa's Wi-Fi module is unresponsive.
- **Parallel TCP + UDP re-discovery.** After 5 consecutive reconnect failures, UDP re-discovery runs alongside continued TCP retries, covering both IP changes and unreliable UDP.

### v1.0.2 -- Stability fixes

- **Memory leak fix.** Temperature history interval is now cleared on shutdown.
- **Missing callback fix.** Added missing `callback(null)` in `setTargetHeatingState` that could cause HomeKit to hang.
- **NaN guard on target temperature.** `getTargetTemp()` returns `undefined` instead of `NaN` before the first state update.
- **Socket data handler crash protection.** Wrapped in `try/catch` to prevent malformed messages from crashing Homebridge.

### v1.0.1 -- Connection resilience

- **TCP keep-alive enabled.** Dead connections are now detected within ~1-2 minutes instead of never.
- **90-second stale connection detection.** Reduced from the original 15-minute check.
- **Exponential backoff reconnection.** Retry delays increase from 20s up to 5 minutes, instead of a single retry.
- **Re-discovery on reconnect failure.** After 5 consecutive failures, triggers UDP re-discovery to handle IP changes.
- **IP change recovery.** When re-discovery finds the spa at a new IP, the connection switches cleanly.
- **Improved log visibility.** Connection-related messages upgraded from `debug` to `warn`/`info`.
- **Hourly connection health log.** Logs uptime and connection count for monitoring.

## Links

- [Upstream issue with full diagnosis and test results](https://github.com/vincedarley/homebridge-plugin-bwaspa/issues/31)
- [Original plugin](https://github.com/vincedarley/homebridge-plugin-bwaspa) by [@vincedarley](https://github.com/vincedarley)

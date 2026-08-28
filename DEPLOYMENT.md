# DropLync Deployment & ClamAV Infrastructure Guide

This document details the production infrastructure configuration for DropLync, specifically the ClamAV antivirus daemon integration, storage structure, and daemon auto-updates.

---

## 1. System & Memory Requirements

ClamAV (`clamd`) loads its complete virus definition database (~250MB+ compiled bytecode and signatures) directly into memory for high-throughput scanning.

- **Minimum Memory Allocation**: 2.5 GB RAM dedicated to the ClamAV service.
- **Recommended Host Specs**: 4+ CPU Cores, 8 GB RAM, NVMe storage.

---

## 2. Docker Compose Deployment

The provided [`docker-compose.yml`](docker-compose.yml) deploys the official `clamav/clamav:latest` container alongside the DropLync web service:

```bash
# Start all services with ClamAV healthcheck verification
docker compose up -d
```

### Key Configuration Directives
1. **Private Network Exposure**: Port `3310` is mapped strictly to `127.0.0.1:3310` (or the internal docker bridge `clamav:3310`). It is **never** exposed to the public internet.
2. **FreshClam Automated Definition Updates**: `FRESHCLAM_CHECKS=12` runs definition updates every 2 hours in the background.
3. **Persistent Signature Volume**: `clamav-signatures` volume prevents re-downloading the entire signature database upon container restart.

---

## 3. Streaming File Inspection (`INSTREAM` Protocol)

DropLync communicates with `clamd` via the standard **RFC ClamAV INSTREAM TCP Protocol**:
1. Connects to `CLAMAV_HOST:CLAMAV_PORT`.
2. Sends the `zINSTREAM\0` initialization command.
3. Streams the file in 64KB chunks prefixed with 4-byte big-endian chunk length headers.
4. Concludes with a 4-byte zero `\0\0\0\0` chunk.
5. ClamAV evaluates the stream and responds with `stream: OK` or `stream: <ThreatName> FOUND`.

**Memory Efficiency**: Because files are read as Node.js Streams (`fs.createReadStream`) directly piped into the TCP socket, multi-GB files are scanned with minimal (~64KB) Node.js heap memory usage.

---

## 4. Fallback Policy (`CLAMAV_FALLBACK_MODE`)

When ClamAV daemon is unreachable or restarts:

| Mode | Configuration | Security Profile | Behavior |
| :--- | :--- | :--- | :--- |
| **Fail-Closed (Default)** | `CLAMAV_FALLBACK_MODE="fail_closed"` | **High Security** | Upload is rejected (HTTP 422) with audit log: `ClamAV-Unavailable-ScanFailed`. Recommended for production environments. |
| **Fail-Open** | `CLAMAV_FALLBACK_MODE="fail_open"` | High Availability | Upload passes through if first-pass structural heuristics (PE/ELF/webshell/EICAR) pass, with warning logged: `[AV Bypass - clamd unavailable]`. |

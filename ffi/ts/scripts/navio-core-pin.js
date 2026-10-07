const fs = require('fs')
const path = require('path')

// The navio-core commit libblsct is built from. This is the package's copy of
// the repository-wide pin in ffi/navio-core.sha: it ships inside the npm
// package so an install-time build can read it. script/sync-navio-core-pin.sh
// refreshes the copy, and script/navio-core-pin-consistency.sh fails CI when
// it drifts from the original.
const PIN_PATH = path.resolve(__dirname, '..', 'navio-core.sha')

const readNavioCorePin = () => {
  const sha = fs.readFileSync(PIN_PATH, 'utf8').trim()
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`${PIN_PATH} must hold one full 40-character navio-core commit SHA, got '${sha}'`)
  }
  return sha
}

module.exports = { readNavioCorePin }

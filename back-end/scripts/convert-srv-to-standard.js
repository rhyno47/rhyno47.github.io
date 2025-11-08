#!/usr/bin/env node
// Small helper that attempts to resolve SRV records from a mongodb+srv URI
// and prints a non-SRV connection string (host:27017,host2:27017,...) so you can paste it into MONGODB_URI.

const dns = require('dns').promises;
const url = require('url');

async function main() {
  const input = process.argv[2] || process.env.MONGODB_URI;
  if (!input) {
    console.error('Usage: node convert-srv-to-standard.js <mongodb+srv://...> OR set MONGODB_URI in env');
    process.exit(2);
  }

  // extract host part
  let hostPart;
  try {
    const parsed = new url.URL(input);
    hostPart = parsed.hostname;
  } catch (e) {
    // if user passed only host
    hostPart = input;
  }

  if (!hostPart) {
    console.error('Could not determine host from input');
    process.exit(2);
  }

  console.log('Resolving SRV records for', hostPart);
  try {
    const records = await dns.resolveSrv(hostPart);
    console.log('SRV records:');
    records.forEach(r => console.log(`  target=${r.name} port=${r.port} priority=${r.priority} weight=${r.weight}`));

    // Build host list with default port 27017 (Atlas nodes typically listen on 27017)
    const hosts = records.map(r => `${r.name}:27017`);
    const example = `mongodb://${hosts.join(',')}/?retryWrites=true&w=majority`;
    console.log('\nExample non-SRV connection string (no credentials):');
    console.log(example);
    console.log('\nNotes:');
    console.log('- Replace with your username:password@ if needed: mongodb://user:pass@host1:27017,host2:27017/dbname?options');
    console.log("- This is a best-effort conversion: SRV TXT options (like replicaSet, authSource) may be present; check Atlas Connect UI for the full non-SRV string.");
  } catch (err) {
    console.error('Failed to resolve SRV:', err.message || err);
    process.exit(1);
  }
}

main();

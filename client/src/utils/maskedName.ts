// Generates the masked anonymous identity shown in the clinical chat
// before a Donation Agreement is fully signed by both parties.
// Format: "Anonymous <Role> #<4-hex>"

function randomHex(len = 4) {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(len, "0")
    .slice(-len);
}

export function maskedName(role = "donor") {
  const r = role === "donor" ? "Donor" : "Recipient";
  return `Anonymous ${r} #${randomHex(4)}`;
}

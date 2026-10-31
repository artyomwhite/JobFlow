import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesProfile } from "@/services/matching";

const profile = { keywords: ["React Developer"], excludedKeywords: ["Angular only"], experienceMin: 0, experienceMax: 2 };

describe("vacancy matching", () => {
  it("keeps a Middle role when the description asks for at most two years", () => {
    const result = matchesProfile("Middle React Developer", "Looking for someone with 1–2 years experience.", profile);
    assert.equal(result.matches, true);
  });

  it("rejects experience requirements above the profile maximum", () => {
    const result = matchesProfile("Junior React Developer", "Requires 3 years experience.", profile);
    assert.equal(result.matches, false);
    assert.match(result.reason, /3\+ years/);
  });

  it("rejects seniority terms in the title", () => {
    assert.equal(matchesProfile("Lead React Developer", "React Developer role.", profile).matches, false);
  });

  it("keeps missing experience as Unverified", () => {
    const result = matchesProfile("React Developer", "Build frontend features with React.", profile);
    assert.equal(result.matches, true);
    assert.match(result.reason, /Unverified experience/);
  });

  it("honors per-profile excluded keywords", () => {
    assert.equal(matchesProfile("React Developer", "Angular only team.", profile).matches, false);
  });
});

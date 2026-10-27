/**
 * Utility for WebAuthn / Windows Hello / Passkey Biometric Verification
 */

export async function isBiometricAvailable(): Promise<boolean> {
  if (
    typeof window !== "undefined" &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  ) {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
  return false;
}

export async function authenticateWithBiometrics(taskId: string, cost: number) {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("WebAuthn is not supported in this browser.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "AgentPay Biometric Safety Guard",
      id: window.location.hostname
    },
    user: {
      id: userId,
      name: "agentpay-operator@local",
      displayName: `AgentPay Operator (${taskId})`
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },  // ES256
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Prompts Windows Hello / TouchID / Device Biometrics
      userVerification: "required"         // Requires Face ID, Fingerprint, or Windows PIN
    },
    timeout: 60000,
    attestation: "none"
  };

  try {
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })) as PublicKeyCredential;

    return {
      success: true,
      credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      type: credential.type,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Biometric authorization was cancelled or timed out.");
    }
    throw new Error(`Biometric verification failed: ${err.message}`);
  }
}

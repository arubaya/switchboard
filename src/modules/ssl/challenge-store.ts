const challenges = new Map<string, string>();

export const acmeChallengeStore = {
  set(token: string, keyAuthorization: string): void {
    challenges.set(token, keyAuthorization);
  },

  get(token: string): string | undefined {
    return challenges.get(token);
  },

  delete(token: string): void {
    challenges.delete(token);
  },

  clear(): void {
    challenges.clear();
  },
};

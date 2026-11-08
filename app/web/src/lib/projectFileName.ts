export const PROJECT_EXTENSION = ".desvtag";
export const PROJECT_FILE_ACCEPT = `${PROJECT_EXTENSION},.enzitag`;

export function projectFileStem(name: string): string {
  return name.replace(/\.(?:desvtag|enzitag)$/i, "");
}

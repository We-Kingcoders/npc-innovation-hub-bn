export const extractMentions = (content: string): string[] => {
  // Match @user-id format (UUID)
  const simplePattern = /@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
  
  // Match @[user-id] format (UUID)
  const bracketPattern = /@\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;
  
  const mentions: string[] = [];
  
  // Extract mentions from simple format
  let match = simplePattern.exec(content);
  while (match !== null) {
    mentions.push(match[1]);
    match = simplePattern.exec(content);
  }
  
  // Extract mentions from bracket format
  match = bracketPattern.exec(content);
  while (match !== null) {
    mentions.push(match[1]);
    match = bracketPattern.exec(content);
  }
  
  // Return unique mentions
  return [...new Set(mentions)];
};
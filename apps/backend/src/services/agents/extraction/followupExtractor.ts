export function extractFollowupsFromText(text: string): Array<{ id: string; label: string }> {
  const followups: Array<{ id: string; label: string }> = [];

  const followupMatch = text.match(/\[FOLLOWUPS:\s*(.+?)\]/i);
  if (followupMatch) {
    const followupText = followupMatch[1];
    const items = followupText.split(',').map(s => s.trim()).filter(Boolean);
    items.forEach((item, index) => {
      followups.push({
        id: `followup_${index + 1}`,
        label: item,
      });
    });
    return followups;
  }

  const numberedPattern = /(?:^|\n)\s*(?:[0-9]+\.|\*\*[0-9]+\.\*\*)\s*([^\n]+)/g;
  let match;
  let count = 0;
  while ((match = numberedPattern.exec(text)) !== null && count < 5) {
    const option = match[1].trim();
    if (option.length <= 100) {
      followups.push({
        id: `followup_${count + 1}`,
        label: option,
      });
      count++;
    }
  }

  return followups.slice(0, 5);
}


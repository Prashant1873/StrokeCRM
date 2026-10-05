const db = require('./db');

/**
 * Cache of mailboxes/labels verified to exist in the current runtime session
 */
const verifiedLabelsCache = new Set();

/**
 * Returns clean label path component for a campaign name
 */
function sanitizeCampaignLabel(campaignName) {
  if (!campaignName || typeof campaignName !== 'string') return '';
  const sanitized = campaignName
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return sanitized ? `StrokeCRM/Campaign: ${sanitized}` : '';
}

/**
 * Maps sentiment classification to its nested StrokeCRM label
 */
function getSentimentLabel(sentiment) {
  if (!sentiment) return null;
  const s = String(sentiment).trim().toUpperCase();
  switch (s) {
    case 'INTERESTED':
      return 'StrokeCRM/Interested';
    case 'QUESTION':
      return 'StrokeCRM/Questions';
    case 'FOLLOW_UP':
      return 'StrokeCRM/Follow-Up';
    case 'NOT_INTERESTED':
    case 'UNSUBSCRIBE':
      return 'StrokeCRM/Not-Interested';
    default:
      return null;
  }
}

/**
 * Checks whether native auto-labeling is enabled in system settings
 */
function isAutoLabelingEnabled() {
  try {
    const settings = db.getSettings ? db.getSettings() : {};
    const val = settings.gmail_auto_labeling;
    return val === '1' || val === 1 || val === true || val === 'true';
  } catch {
    return true;
  }
}

/**
 * Checks if the connected IMAP server is Gmail or supports Gmail extensions
 */
function isGmailImap(client) {
  if (!client) return false;
  if (client.capabilities && client.capabilities.has('X-GM-EXT-1')) return true;
  const host = client.options?.host || '';
  return /gmail\.com|googlemail\.com/i.test(host);
}

/**
 * Safely creates a label/mailbox in IMAP if not already verified
 */
async function ensureSingleLabel(client, labelPath) {
  if (!labelPath || verifiedLabelsCache.has(labelPath)) return;
  try {
    await client.mailboxCreate(labelPath);
    verifiedLabelsCache.add(labelPath);
  } catch (err) {
    // If mailbox already exists, mark verified and continue
    if (/alreadyexists|exists|duplicate/i.test(err.message || '')) {
      verifiedLabelsCache.add(labelPath);
    } else {
      console.warn(`[StrokeCRM Gmail Labels] Could not create label "${labelPath}": ${err.message}`);
    }
  }
}

/**
 * Ensures standard StrokeCRM folder hierarchy exists on the IMAP account
 */
async function ensureLabelHierarchy(client, campaignName = null) {
  if (!client) return;

  const coreLabels = [
    'StrokeCRM',
    'StrokeCRM/Replied',
    'StrokeCRM/Interested',
    'StrokeCRM/Questions',
    'StrokeCRM/Follow-Up',
    'StrokeCRM/Not-Interested',
    'StrokeCRM/Bounced'
  ];

  for (const label of coreLabels) {
    await ensureSingleLabel(client, label);
  }

  if (campaignName) {
    const campaignLabel = sanitizeCampaignLabel(campaignName);
    if (campaignLabel) {
      await ensureSingleLabel(client, campaignLabel);
    }
  }
}

/**
 * Applies labels to a message in the currently selected mailbox by UID.
 * On Gmail IMAP, copying a message UID to a mailbox folder attaches that label to the message thread.
 */
async function applyLabelsToMessage(client, uid, labels = []) {
  if (!client || !uid || !Array.isArray(labels) || labels.length === 0) return;
  if (!isAutoLabelingEnabled()) return;

  for (const label of labels) {
    if (!label) continue;
    try {
      await ensureSingleLabel(client, label);
      // UID COPY to target folder tags the thread with that label in Gmail IMAP
      await client.messageCopy(String(uid), label, { uid: true });
    } catch (err) {
      // Non-fatal notice: some IMAP servers may restrict copying or already have message tagged
      if (!/alreadyexists|duplicate/i.test(err.message || '')) {
        console.warn(`[StrokeCRM Gmail Labels] Notice applying label "${label}" to UID ${uid}: ${err.message}`);
      }
    }
  }
}

/**
 * Comprehensive label synchronizer for an incoming reply or bounce notification
 */
async function syncLabelsForEvent(client, uid, { campaignName, sentiment, isBounce = false }) {
  if (!client || !uid) return;
  if (!isAutoLabelingEnabled()) return;

  try {
    const labelsToApply = ['StrokeCRM'];

    if (campaignName) {
      const campLabel = sanitizeCampaignLabel(campaignName);
      if (campLabel) labelsToApply.push(campLabel);
    }

    if (isBounce) {
      labelsToApply.push('StrokeCRM/Bounced');
    } else {
      labelsToApply.push('StrokeCRM/Replied');
      const sentimentLabel = getSentimentLabel(sentiment);
      if (sentimentLabel) {
        labelsToApply.push(sentimentLabel);
      }
    }

    await applyLabelsToMessage(client, uid, labelsToApply);
  } catch (err) {
    console.error('[StrokeCRM Gmail Labels] Failed syncing labels for UID', uid, err.message);
  }
}

module.exports = {
  sanitizeCampaignLabel,
  getSentimentLabel,
  isAutoLabelingEnabled,
  isGmailImap,
  ensureLabelHierarchy,
  applyLabelsToMessage,
  syncLabelsForEvent
};

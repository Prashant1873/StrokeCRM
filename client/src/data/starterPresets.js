export const STARTER_PRESETS = [
  {
    id: 'direct-pitch',
    name: 'Direct Problem-Solution Pitch',
    category: 'Cold Outbound',
    stepRecommendation: 'Step 1: Initial Touch',
    badge: 'High Reply Rate',
    description: 'Hyper-focused problem-solution approach with a low-friction 5-minute call-to-action.',
    subject: "Quick question regarding {{company}}'s outreach deliverability",
    body: `Hi {{firstName}},<br><br>I noticed {{company}} is actively scaling outbound this quarter. Most sales and outreach teams we speak with face throttled mailboxes and spam folder placement that silently suppresses response rates.<br><br>We built StrokeCRM to solve this with automated throttle jitter, RFC 2822 threading, and instant reply disarming.<br><br>Would you be open to a quick 5-minute look at how we protect sender reputation?`
  },
  {
    id: 'case-study',
    name: 'Social Proof & Benchmark Teaser',
    category: 'Social Proof',
    stepRecommendation: 'Step 1 Alternative',
    badge: 'Credibility',
    description: 'Showcases peer performance benchmarks and offers a benchmark comparison.',
    subject: 'How similar teams doubled reply rates at {{company}}',
    body: `Hi {{firstName}},<br><br>Reaching out because teams similar to {{company}} recently doubled their qualified meetings while cutting spam placement to near zero.<br><br>By pacing outbound emails across customized throttle intervals and immediately disarming follow-ups the moment a prospect replies, their domain health stayed pristine.<br><br>Do you have 10 minutes next Tuesday to review the benchmark data?`
  },
  {
    id: 'bump-followup',
    name: 'The 3-Day Quick Bump',
    category: 'Follow-Up Drip',
    stepRecommendation: 'Step 2: Follow-Up',
    badge: 'Short & Tactful',
    description: 'Ultra-short 35-word bump asking if they are the appropriate stakeholder.',
    subject: "Re: Quick question regarding {{company}}'s outreach deliverability",
    body: `Hi {{firstName}},<br><br>Following up on my note from earlier this week in case it got buried.<br><br>Are you still the right person at {{company}} to talk to about improving cold email deliverability and response capture?<br><br>If so, what does your calendar look like this Thursday?`
  },
  {
    id: 'breakup-closing',
    name: 'The Polite Breakup Closing',
    category: 'Sequence Closer',
    stepRecommendation: 'Step 3: Final Touch',
    badge: 'High Conversion',
    description: 'Graceful withdrawal of outreach that frequently triggers reverse FOMO replies.',
    subject: 'Closing the loop for {{company}}',
    body: `Hi {{firstName}},<br><br>I haven't heard back, so I assume cold outreach deliverability isn't a top priority for {{company}} right now.<br><br>I won't clutter your inbox further. If priorities shift down the road, feel free to reach back out anytime.<br><br>Wishing you and {{company}} continued success!`
  }
];

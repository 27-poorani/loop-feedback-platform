export const SIMULATED_CHANNELS = {
  "App store review": [
    { content: "Crashes every time I try to export a report. Please fix!", customerLabel: "iOS user" },
    { content: "Clean interface, does exactly what we need. Five stars.", customerLabel: "Android user" },
    { content: "Wish there was a dark mode option.", customerLabel: "iOS user" },
    { content: "Sync between devices is unreliable, lost data twice.", customerLabel: "iOS user" },
    { content: "Best feedback tool we've tried, worth the price.", customerLabel: "Android user" },
  ],
  "Social mentions": [
    { content: "Just tried @loop_app for our support tickets, actually impressed so far", customerLabel: "@sarahbuilds" },
    { content: "anyone else find the loop pricing page confusing? can't tell what's included", customerLabel: "@devmike" },
    { content: "loop's ai summary feature just saved me 2 hours of reading tickets", customerLabel: "@pmjenny" },
    { content: "customer support for loop itself is slow to respond honestly", customerLabel: "@growth_kate" },
  ],
  "Support ticket": [
    { content: "CSV export button doesn't work on Safari, only Chrome.", customerLabel: "TechFlow Inc" },
    { content: "Need bulk delete for old feedback items, currently one by one only.", customerLabel: "Nimbus Co" },
    { content: "API rate limits are too low for our usage, need enterprise tier options.", customerLabel: "ScaleUp Ltd" },
    { content: "Love the product but billing page is confusing, unclear what we're charged for.", customerLabel: "Delta Systems" },
  ],
} as const;
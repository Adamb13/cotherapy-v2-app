# Session Notes Page — Design Spec

Approved design reference for PostSession.jsx (Session Notes workspace).

## Layout
- 60/40 split panel, both panels scroll independently
- Left panel: session notes editor + extracted moments + KTMs
- Right panel: intersession configuration (always visible)

## Brand Palette
- Primary teal: `#1a3a3a` (buttons, headings, selected text)
- Sage: `#7d9a8c` (borders, focus rings, selected borders)
- Sage light: `#f0f5f2` (selected backgrounds, primary button text)
- Panel bg: `#faf9f6` (right panel warm neutral)
- Description text (selected): `#4a6a5a`

## Global Rules
- ALL selected/active states: bg `#f0f5f2`, border `#7d9a8c`, text `#1a3a3a`
- ALL input focus states: border-color `#7d9a8c`, no browser blue
- NO blue, coral, red, orange, or yellow-green on selected states
- Sentence case on all labels and headings
- Both panels scroll independently

---

## Left Panel (60%)

### Title area
- Title: "Session notes" (sentence case, 16px, weight 500, color `#1a3a3a`)
- Subtitle: "Paste or type notes from your session. AI will extract clinical moments for review." (12px, `#888`)
- 16px gap before date/duration row

### Date and duration
- Inline row, 20px gap between fields
- Consistent field sizing, padding `6px 10px`

### Textarea
- Placeholder line 1: "Paste your session notes here..."
- Placeholder body: "Include themes discussed, emotional shifts, client insights, homework assigned, and any significant moments from the session. The more detail you provide, the better the AI can extract meaningful clinical moments."
- Min height: `calc(100vh - 300px)`, min `350px`
- Focus border: `#7d9a8c`

### Buttons
- "Save notes" — secondary: transparent bg, `1px solid #7d9a8c`, text `#1a3a3a`, padding `8px 20px`, border-radius `6px`
- "Save & extract moments" — primary: bg `#1a3a3a`, text `#f0f5f2`, no border, padding `8px 20px`, border-radius `6px`

---

## Right Panel (40%)

### Container
- Background: `#faf9f6`
- Left border: `0.5px solid #e0e0e0`
- Padding: `24px` all sides
- Section spacing: `20px` margin-top between sections

### Section header
- Title: "Intersession setup" (sentence case, 16px, weight 500, `#1a3a3a`)
- Subtitle: "Configure AI behavior between now and the next session" (12px, `#888`)
- 16px gap before first field

### Integration direction — Radio card style
- Each card: radio circle left + text block right
- Radio circle: 18px, 1.5px border, `#7d9a8c` unselected
- Selected radio: filled `#1a3a3a` with `box-shadow: inset 0 0 0 3px #f0f5f2`
- Card padding: `10px 14px`, border-radius `8px`, gap between cards `6px`
- Unselected: white bg, `0.5px solid #e0e0e0` border
- Selected: `#f0f5f2` bg, `1px solid #7d9a8c` border
- Selected description: `#4a6a5a`

Options:
1. Reflective — Explore feelings, process session themes
2. Behavioral — Reinforce homework, track behavioral goals
3. Cognitive — Challenge distortions, practice reframing
4. Somatic — Body awareness, grounding exercises
5. Stabilization — Containment, resourcing, safety focus

### TIM level — Compact boxes
- 5 equal-width boxes, horizontal row
- Number: 14px, weight 500
- Label below (ALL boxes): 9px
- Padding: `10px 6px`, gap `6px`, border-radius `8px`
- Unselected: white bg, `0.5px solid #e0e0e0`, number primary, label `#888`
- Selected: `#f0f5f2` bg, `1px solid #7d9a8c`, number `#1a3a3a`, label `#4a6a5a`

Labels:
1. Reflect & resource
2. Support & reinforce
3. Guided exploration
4. Active integration
5. Deep engagement

### Topics to avoid
- Label: "Topics to avoid" (sentence case)
- Placeholder: "e.g., divorce proceedings, sister relationship"
- Hint: "AI will redirect away from these topics" (10px, `#999`)
- Input padding: `10px 14px`

### Clinical considerations
- Label: "Clinical considerations" (sentence case)
- Textarea, 3 rows
- Placeholder: "e.g., History of dissociation — avoid deep exploration without grounding first"

### Next session
- Label: "Next session" (sentence case)
- Date + time side by side, 8px gap
- Same height, border style, padding

### Save row
- Right-aligned, flex with justify-content: flex-end
- "Cancel" — text link style: no border, no bg, color `#888`
- "Save & update" — primary: bg `#1a3a3a`, text `#f0f5f2`
- 20px margin-top, subtle top border separator (`1px solid #eee`)

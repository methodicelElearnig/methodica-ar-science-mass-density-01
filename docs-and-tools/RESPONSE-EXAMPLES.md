# `result.response` examples — methodica-science-mass-density-01

Real strings captured from the offline stub on 2026-11-02 (`__stmts()`), one per question type. The
delimiters are the xAPI ones (`[,]` list, `[.]` pair); every piece is the catalogue string byte for byte.

| part / question | type | call-site spec | response |
|---|---|---|---|
| 06 001/q1 | choice | `{ choices: [index] }` | `פוליפרופילן ופוליאתילן יצופו. פי-וי-סי ופוליאסטר ישקעו.` |
| 05 003/q1 | choice (multiple) | `{ choices: [0, 2] }` | `אמיר: צפיפות היא …[,]שיר: צפיפות היא תכונה של החומר. …` (answers order, whatever the click order) |
| 02 001/q1 | performance | `{ steps: [9 typed values] }` | `מסה (גרם) - חומר א[.]81[,]נפח (סמ"ק) - חומר א[.]30[,]צפיפות (גרם/סמ"ק) - חומר א[.]2.7[,]…` |
| 03 004/q1 | performance | `{ steps: [v1, v2] }` | `צפיפות המים (גרם/סמ"ק)[.]1[,]התנהגות חומר בצפיפות 2.3 במים[.]ישקע` |
| 02 001/q2 | matching | `{ pairs: [{source: index, target: index}] }` | `נחושת (צפיפות: 8.96)[.]הקו העליון בגרף[,]אלומיניום (צפיפות: 2.7)[.]הקו האמצעי בגרף[,]עץ אורן (צפיפות: 0.5)[.]הקו התחתון בגרף` |
| 02 004/q1 | matching | indexes | `כדור עופרת חלול (ריק מבפנים) - צפיפות: 0.8 (גרם/סמ"ק)[.]יצוף[,]…` |
| 06 001/q3 | matching (blanks) | `{ pairs: [{source: label, target: blank index}] }` | `פוליפרופילן[.]מעל פני הים: סוג פלסטיק ראשון[,]פוליאתילן[.]מעל פני הים: סוג פלסטיק שני[,]…` |
| 07 001/q1 | matching (dropdowns) | `{ pairs: [{source: 0, target: 'נמוכה'}, {source: 1, target: 'גבוהה'}] }` | `במצב "ציפה" הצפיפות הממוצעת של הצוללת[.]נמוכה[,]במצב "צלילה" הצפיפות הממוצעת של הצוללת[.]גבוהה` |
| 07 001/q2 | sequencing | `{ order: [step texts] }` | `מכלי האיזון מתמלאים במי ים.[,]מסת הצוללת גדלה.[,]הצפיפות הממוצעת גדלה.[,]הצוללת שוקעת.` |
| 02 003/q1 | true-false | `{ value: true }` | `true` |

Only PLACED pairs are reported for matching; a wrong pair sorts after the right ones (gas-01 layer,
MOE QA 2026-10-25). Sites that pass catalogue indexes instead of labels: 01 008/q1 (float / sink cards
show the name without the density), 02 001/q2 and 004/q1 (same), every single-choice screen (option
`a..d` → index; the on-screen order equals the catalogue order, verified per question), 05 003/q1.
Everything else passes the on-screen text, which `_xapiPick` resolves to the catalogue string
(normalised comparison); an unresolvable text warns in the console, and `_test/verify-report.js`
would fail on it.

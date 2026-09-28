# תמונות הדגמה

כל התמונות כאן נועדו להמחשה בלבד ואינן מציגות מוצר של עסק אמיתי.

מקור הנכסים הקיימים מתועד גם במטא־נתונים של PNG ובקובצי `*.webp.json`, לפי גרסת המאגר שממנה נלקחו והפירוט בהמשך. אלה רשומות מקור לנכסים קיימים; התוכן החזותי נשמר והן אינן פרומפטים חדשים ששוחזרו בדיעבד.

## זהות חזותית להדגמה

`brand/oven-mark.svg` ו־`brand/favicon.svg` עוצבו בקוד ב־28.9.2026: קשת תנור כפולה, קו אפייה בצבע עגבנייה ושני קווי חום. זהו סמל מקורי למוקאפ, ולא לוגו מאושר של עסק אמיתי. סמלי פירוט המחיר והשכפול ב־`src/app.js` צוירו כ־SVG באותה משפחת קווים.

אין עדיין צילומים אמיתיים של הפיצרייה. אין להציג את תמונות ההמחשה כצילום המוצר בפועל. כשיימסר צילום אמיתי, אפשר להחליף את `shop.heroImages.mobile`, `shop.heroImages.desktop` ואת `shop.heroImages.alt` ב־`src/data.js`; לוגו מאושר יכול להחליף את `shop.logo`. יש לספק חיתוכים נפרדים למובייל ולדסקטופ.

## בסיסי הפיצה

- `pizza-base-v2.png`: תמונת מקור שקופה שנוצרה בכלי ImageGen המובנה ב־27.9.2026. פרומפט: צילום אוכל מציאותי של פיצה מרגריטה עגולה ממבט אנכי, שוליים זהובים עם חריכה קלה, רוטב עגבניות ומוצרלה, ללא תוספות, צלחת, רקע, ידיים, טקסט או לוגו; רקע שקוף ומרווח מסביב לפיצה.
- `pizza-base-thin-v2.png`: עריכת התמונה הקודמת באותו כלי. פרומפט: צמצום רוחב שולי הבצק לכמחצית תוך שימור המבט האנכי, הקוטר הכולל, הרוטב, הגבינה, מרקם הצילום והרקע השקוף.
- `pizza-base-v2.webp` ו־`pizza-base-thin-v2.webp`: גרסאות תצוגה עם שקיפות, שהומרו מה־PNG ללא שינוי תוכן חזותי. התמונות המצולמות משמשות בסיס; `src/pizza.js` מציב מעליהן את נכסי התוספות לפי בחירת הלקוח.

## נכסי התוספות

ששת הקבצים ב־`toppings/` נוצרו בכלי ImageGen המובנה ב־28.9.2026. כל נכס מציג פריט יחיד ממבט אנכי, עם רקע שקוף; אלה תמונות המחשה שנוצרו ואינן צילום של תוספות העסק.

נוסח משותף לפרומפטים: "Use case: product-mockup. Asset type: transparent food topping sprite for a live pizza configurator. True transparent background with clean cutout, no plate, no pizza, no other food, no text, no label, no border, no cast shadow. Subject fills about 65% of square frame with comfortable transparent margin. Direct overhead view. Warm realistic food photography matching a wood-fired mozzarella pizza, crisp natural 3D texture, no cartoon illustration."

נושא כל נכס:
- `olive.webp`: "ONE single photorealistic black olive ring slice, naturally irregular and slightly glossy from oil, with subtle brown-purple olive flesh and dark interior."
- `mushroom.webp`: "ONE single thin roasted mushroom slice, cap and stem recognizable, ivory beige with warm golden browned edges, slightly moist and uneven."
- `corn.webp`: "ONE single plump sweet corn kernel, butter yellow with a little toasted amber variation, irregular natural shape."
- `onion.webp`: "ONE single curved crescent sliver of red onion, purple-magenta with translucent pale inner layers, lightly softened as on baked pizza."
- `jalapeno.webp`: "ONE single sliced green jalapeño ring, recognizable uneven pepper walls, seeds and pale pith visible, lightly roasted edges."
- `feta.webp`: "ONE single small irregular chunk of baked feta cheese, off-white creamy surface with faint toasted golden edges and crumbly texture."

הפלטים השקופים נחתכו סביב התוכן עם מרווח של 15%, הוקטנו ל־192×192 והומרו ל־WebP באיכות 88 תוך שימור השקיפות. משקל כל השישה יחד כ־75KB. הם משמשים הן בכרטיסי הבחירה והן בתצוגת הפיצה.

## תמונות הפתיחה

`pizza-hero-mobile.png` ו־`pizza-hero-desktop.png` הם קובצי המקור להדגמה. גרסאות ה־JPEG המקבילות מוגשות באתר.

## מוצר נוסף בתצורת הדגמה

`garlic-bread-demo.png` נוצר בכלי ImageGen המובנה ב־27.9.2026. פרומפט: צילום אוכל מציאותי של כיכר לחם שום חתוכה לפרוסות, חמאת שום, פטרוזיליה ומעט מלח, מבט מלמעלה, מבודד על רקע שקוף, ללא צלחת, ידיים, טקסט או לוגו. `garlic-bread-demo.webp` היא גרסת התצוגה הקלה, המשמשת בהרכבה, בסל ובסיכום המוצר. צילום התפריט מוגדר בנפרד.

## תמונות התפריט

ארבע התמונות הבאות נוצרו בכלי ImageGen המובנה ב־28.9.2026 עבור תפריט ההדגמה. אלה תמונות המחשה שנוצרו ב־AI, ולא צילומי מוצרים של פיצרייה אמיתית. כולן משתמשות בצילום אוכל חם על עץ כהה, ללא טקסט, מיתוג או רכיבי ממשק בתוך התמונה. הכותרות, המחירים והכפתורים מוצגים ב־HTML.

| קובץ | תוכן חזותי | ממדים | משקל | פרומפט מקורי מלא |
| --- | --- | --- | --- | --- |
| `menu-pizza-v1.webp` | פיצה אחת עם מוצרלה ורוטב עגבניות, ללא תוספות | 888×592 | 145.1 KiB | [menu-pizza-v1.webp.json](menu-pizza-v1.webp.json) |
| `menu-garlic-v1.webp` | כיכר לחם שום אחת חתוכה לפרוסות, ללא פיצה | 888×592 | 124.7 KiB | [menu-garlic-v1.webp.json](menu-garlic-v1.webp.json) |
| `menu-family-v1.webp` | שתי פיצות וכיכר לחם שום אחת משמאל; כ־40% עץ כהה ריק מימין לטקסט חי | 1120×467 | 92.7 KiB | [menu-family-v1.webp.json](menu-family-v1.webp.json) |
| `menu-combo-v1.webp` | פיצה אחת וכיכר לחם שום אחת | 888×592 | 132.7 KiB | [menu-combo-v1.webp.json](menu-combo-v1.webp.json) |

גרסאות WebP אטומות באיכות 82, במשקל כולל של 506,966 בתים (כ־495 KiB). התמונות הוקטנו באופן יחסי מהפלטים המקוריים, ללא חיתוך, ריטוש או שינוי קומפוזיציה. קובצי ה־PNG המקוריים נשארו מחוץ למאגר. קובצי המקור המלאים, ממדיהם ובדיקת הרכב המנות מתועדים ב־[asset-manifest.json](../.impeccable/review/menu3/asset-manifest.json). הפרומפטים הועתקו בדיוק מרשומת היצירה באמצעות כלי `embed-prompt.mjs` שנכלל במיומנות Impeccable.

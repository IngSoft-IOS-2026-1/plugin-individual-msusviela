|| Miranda sample focused on realistic syntax + relevant linter scenarios.
|| This file intentionally contains both valid and invalid snippets.

|| ---------- Core definitions ----------
identity x = x
compose f g x = f (g x)
pair x y = (x, y)
cons x xs = x : xs
swap (x, y) = (y, x)

|| ---------- Prelude-backed helpers ----------
boolText b = showbool b
pairText x y = showpair showchar showstring (x, y)
listText xs = showlist shownum xs
stringText s = showstring s
charText c = showchar c
parenText x = showparen shownum x
functionText f = showfunction f
abstractText x = showabstract x
whatText x = showwhat x
voidText x = showvoid x
numberText n = shownum1 n

|| ---------- Prelude-heavy usage ----------
mapDemo xs = map showchar xs
filterDemo xs = filter showbool xs
takeDemo xs = take 3 xs
dropDemo xs = drop 1 xs
repDemo x = rep 3 x
firstRestDemo tup = first tup ++ rest tup
diagDemo xs = diagonalise xs ++ diag 1 xs
indentDemo p q = indent p q
outdentDemo p = outdent p
listOps x xs = listdiff x xs
removeDemo x xs = remove x xs
baseDemo r x = base r x
digitDemo c = digit c
mkdigitDemo n = mkdigit n
charnameDemo c = charname c

|| ---------- Operators and comparisons ----------
mathDemo a b = shownum (a + b) ++ shownum (a div b) ++ shownum (a mod b)
comparisonDemo a b = if a <= b otherwise a >= b
booleanDemo b = if b otherwise False
equalityDemo x y = x ~= y

|| ---------- Lists, tuples, and literals ----------
tupleAndListDemo x y c = [(x, y), (y, x), (x, x), (x, c)]
charListDemo = ['a', '\\n', 'z']
stringDemo = "Miranda static helper"
prettyList = showlist showchar ['m', 'i', 'r', 'a', 'n', 'd', 'a']

|| ---------- Valid where block ----------
whereGood x = y
  where
  y = x + 1

|| ---------- Main showcase (uses almost everything above) ----------
demo =
	boolText (booleanDemo True) ++
	pairText 'a' "alpha" ++
	listText [1, 2, 3] ++
	stringText stringDemo ++
	charText 'c' ++
	parenText (identity 42) ++
	functionText identity ++
	abstractText (pair 1 2) ++
	whatText (pair 1 2) ++
	voidText () ++
	numberText (compose identity identity 7) ++
	showstring (showlist showchar (mapDemo ['m', 'i'])) ++
	showstring (showlist showbool (filterDemo [True, False])) ++
	showstring (showlist shownum (takeDemo [1, 2, 3, 4])) ++
	showstring (showlist shownum (dropDemo [1, 2, 3, 4])) ++
	showstring (showlist showchar (repDemo 'x')) ++
	firstRestDemo (pair "first" "rest") ++
	showstring (showlist showchar (diagDemo [[1], [2], [3]])) ++
	showstring (showlist shownum (listOps [1, 2, 3] [2])) ++
	showstring (showlist shownum (removeDemo 2 [1, 2, 3])) ++
	showstring (baseDemo 10 42) ++
	showstring (showlist showbool [digitDemo '1', digitDemo 'a']) ++
	showstring (showlist shownum [mkdigitDemo 1, mkdigitDemo 2]) ++
	charnameDemo 'a' ++
	showstring (showlist showchar charListDemo) ++
	showstring (showlist showpair shownum shownum (tupleAndListDemo 1 2 3)) ++
	shownum (whereGood 10)

|| extra coverage to avoid noisy "unused" warnings in normal section
coverageSink =
	cons 'x' ['y', 'z'] ++
	showpair shownum shownum (swap (10, 20)) ++
	shownum (outdentDemo (indentDemo 1 2)) ++
	mathDemo 12 5 ++
	showbool (comparisonDemo 2 3) ++
	showbool (equalityDemo 4 4)

|| ---------- Intentional diagnostics (each with expected message) ----------

|| EXPECT: Opening bracket '(' is not closed.
|| EXPECT: Definition 'badParen' appears to have unbalanced brackets in the right-hand side expression.
badParen x = (x + 1

|| EXPECT: Function 'duplicate' is defined more than once (multiple clauses).
duplicate a = a + 1
duplicate a = a + 2
duplicateUse = duplicate 10

|| EXPECT: Name 'ghostValue' is used but not defined in the current document or prelude.
ghostUse = ghostValue 7
ghostUseSink = ghostUse

|| EXPECT: Type declaration 'typedAgain' is duplicated.
typedAgain :: Num -> Num
typedAgain :: Num -> Num

|| EXPECT: Definition 'incompleteFn' is incomplete. Add an expression after '='.
incompleteFn x =

|| EXPECT: Line inside a where block should be indented more than the where line.
whereBad x = y
  where
y = x + 1
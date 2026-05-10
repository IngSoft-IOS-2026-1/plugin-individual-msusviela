|| Miranda sample with richer syntax coverage and only a few intentional diagnostics.

|| Core definitions
identity x = x
compose f g x = f (g x)
pair x y = (x, y)
cons x xs = x : xs
swap (x, y) = (y, x)

|| Prelude-backed helpers
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

|| Prelude-heavy usage for highlight coverage
mapDemo xs = map showchar xs
filterDemo xs = filter showbool xs
takeDemo xs = take 3 xs
dropDemo xs = drop 1 xs
repDemo x = rep 3 x
firstRestDemo tup = first tup ++ rest tup
diagDemo xs = diagonalise xs ++ diag 1 xs
indentDemo p q = indent p q
outdentDemo p = outdent p
listOps x xs ys = listdiff x xs ys
removeDemo x xs = remove x xs
baseDemo r x = base r x
digitDemo c = digit c
mkdigitDemo n = mkdigit n
charnameDemo c = charname c

|| Operators and comparison
mathDemo a b = (a + b) ++ shownum (a div b) ++ shownum (a mod b)
comparisonDemo a b = if a <= b otherwise a >= b
booleanDemo b = if b otherwise False
equalityDemo x y = x ~= y

|| Lists, tuples, and characters
tupleAndListDemo x y c = [(x, y), (y, x), (x, x)]
charListDemo = ['a', '\\n', 'z']
stringDemo = "Miranda static helper"
prettyList = showlist showchar ['m', 'i', 'r', 'a', 'n', 'd', 'a']

|| Where indentation
whereBad x = helperWhere x where
helperWhere y = y + 1

|| Showcase that uses the helpers above
demo =
	boolText (booleanDemo True) ++
	pairText 'a' "alpha" ++
	listText [1, 2, 3] ++
	stringText "hello" ++
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
	showstring (showlist showchar (diagDemo [[1], [2]])) ++
	showstring (showlist shownum (listOps [1, 2, 3] [2])) ++
	showstring (showlist shownum (removeDemo 2 [1, 2, 3])) ++
	showstring (showlist shownum (baseDemo 10 42)) ++
	showstring (showlist showbool [digitDemo '1', digitDemo 'a']) ++
	showstring (showlist shownum [mkdigitDemo 1, mkdigitDemo 2]) ++
	charnameDemo 'a'

|| Intentional diagnostics, kept small
badParen x = (x + 1
duplicate a = a + 1
duplicate a = a + 2
ghostUse = ghostValue 7
typedAgain :: Num -> Num
typedAgain :: Num -> Num
incompleteFn x =
|| Miranda smoke fixture for linter regression checks.
|| Goal: minimal snippets per rule, with explicit expected diagnostics.

|| ---------- Valid baseline (should not trigger diagnostics) ----------
okIdentity x = x
okPair a b = (a, b)
okMap xs = map shownum xs
okWhere x = y
  where
  y = x + 1

|| Uses baseline symbols to avoid noisy "unused" warnings.
okSink =
	shownum (okIdentity 3) ++
	showpair shownum shownum (okPair 1 2) ++
	showstring (showlist shownum (okMap [1, 2, 3])) ++
	shownum (okWhere 9)

|| ---------- Definition / syntax diagnostics ----------

|| EXPECT: miranda.definition.unbalancedRhs
|| EXPECT: miranda.brackets.unclosed
badParen x = (x + 1

|| EXPECT: miranda.definition.duplicate
dup a = a + 1
dup a = a + 2

|| EXPECT: miranda.definition.undefined
ghostUse = ghostValue 7

|| EXPECT: miranda.type.duplicate
typedAgain :: Num -> Num
typedAgain :: Num -> Num

|| EXPECT: miranda.definition.incomplete
incompleteFn x =

|| ---------- Indentation diagnostics ----------

|| EXPECT: miranda.indentation.where
whereBad x = y
  where
y = x + 1

|| EXPECT: miranda.indentation.mixedWhitespace
 	mixedIndent = 1

|| ---------- Style diagnostics ----------

|| EXPECT: miranda.style.equalsSpacing
styleEq=x

|| EXPECT: miranda.style.commaSpacing
styleComma = [1,2,3]

|| EXPECT: miranda.style.parenthesesUsage
styleParen x = (x)

|| ---------- Complexity / arity diagnostics ----------

|| EXPECT: miranda.complexity.high
complexHigh x = if x otherwise if x otherwise if x otherwise False

|| EXPECT: miranda.complexity.recursive
recursiveDemo x = recursiveDemo x

|| EXPECT: miranda.definition.callArity
arityBad xs = map xs

|| Use most valid symbols above to keep fixture noise controlled.
smokeSink =
	okSink ++
	shownum (dup 3) ++
	showstring (showlist shownum (arityBad [1, 2])) ++
	showbool (complexHigh True)

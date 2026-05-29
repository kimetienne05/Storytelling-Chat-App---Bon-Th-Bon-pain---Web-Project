console.log("je suis un test");

function strcmp(a: string, b: string) {
  if (a.toString() < b.toString()) return -1;
  if (a.toString() > b.toString()) return 1;
  return 0;
}

function goodUsername(name: string): string {
  if (name.length > 50) {
    return "Name est trop long et est pourtant passé";
  }
  if (/(Kim|Emie|Aanor)/.test(name)) {
    return "Name contient un des noms sacrés et interdits et est pourtant passé";
  }
  return "";
}

Deno.test("username valide", () => (strcmp(goodUsername("super"), "") == 0));
Deno.test("username invalide taille", () =>
  strcmp(
    goodUsername(
      "superincroyablegenialfranchementsuperdc'estlavielebohneurlewawleWAAAAAAAAAAAAAAAAAAAAAAAAAAAwaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ),
    "",
  ) != 0);
Deno.test("username invalide nom sacré 1", () => {
  const res = goodUsername("Emie");
  if (strcmp(res, "") == 0) {
    throw new Error(res);
  }
});
Deno.test("username invalide nom sacré 2", () => {
  const res = goodUsername("Aanor");
  if (strcmp(res, "") == 0) {
    throw new Error(res);
  }
});
Deno.test("username invalide nom sacré 3", () => {
  const res = goodUsername("Kim");
  if (strcmp(res, "") == 0) {
    throw new Error(res);
  }
});

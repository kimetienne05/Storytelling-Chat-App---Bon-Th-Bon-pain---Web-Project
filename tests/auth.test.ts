console.log("je suis un test");

function strcmp(a: string, b: string) {
  if (a.toString() < b.toString()) return -1;
  if (a.toString() > b.toString()) return 1;
  return 0;
}

function goodUsername(name: string): string {
  if (name.length > 50) {
    return "Name est trop long";
  }
  if (!/"Kim\| Emie\| Aanor\|"/.test(name)) {
    return "Name contient un des noms sacrés et interdits";
  }
  return "";
}

Deno.test("username valide", () => strcmp(goodUsername("super"), "") == 0);

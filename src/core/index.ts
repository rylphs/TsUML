import * as fs from "fs";
import chalk from "chalk";
import { flatten, join } from "lodash";
import { findFilesByGlob, download } from "./io";
import { getAst, parseClasses, parseInterfaces, parseHeritageClauses } from "./parser";
import { emitSingleClass, emitAssociations, emitSingleInterface, emitHeritageClauses } from "./emitter";
import { SourceFile, ClassDeclaration } from "ts-simple-ast";

async function getDsl(tsConfigPath: string, pattern: string) {

  const sourceFilesPaths = await findFilesByGlob(pattern);

  console.log(
    chalk.yellowBright(
      "Matched files:\n" + sourceFilesPaths.reduce((p, c) => `${p}${c}\n`, "")
    )
  );

  const ast = getAst(tsConfigPath, sourceFilesPaths);
  const files = ast.getSourceFiles();

  const trackedClasses = files.map((f:SourceFile) => f.getClasses())
    .reduce((v:ClassDeclaration[], current: any) => {
      if(current.length > 0)
        v.push.apply(v, current);
      return v;
    }, []).map(value => value.getName());

  trackedClasses.push.apply(trackedClasses, files.map((f:SourceFile) => f.getInterfaces())
    .reduce((v:ClassDeclaration[], current: any) => {
      if(current.length > 0)
        v.push.apply(v, current);
      return v;
    }, []).map(value => value.getName()));

console.log(trackedClasses);

  // parser
  const declarations = files.map(f => {
    const classes = f.getClasses();
    const interfaces = f.getInterfaces();
    const path = f.getFilePath();
    return {
      fileName: path,
      classes: classes.map((parsedClass)=> parseClasses(parsedClass, trackedClasses)),
      heritageClauses: classes.map(parseHeritageClauses),
      interfaces: interfaces.map(parseInterfaces)
    };
  });

  // emitter
  const entities = declarations.map(d => {
    const classes = d.classes.map((c) => emitSingleClass(c.className, c.properties, c.methods));
    const interfaces = d.interfaces.map((i) => emitSingleInterface(i.interfaceName, i.properties, i.methods));
    const heritageClauses = d.heritageClauses.map(emitHeritageClauses);
    const associations = d.classes.map((c) => emitAssociations(c.className, c.properties));
    //return [associations];
    return [...classes, ...interfaces, ...heritageClauses, ...associations];
  });

  return join(flatten(entities), ",");

}

export async function getUrl(tsConfigPath: string, pattern: string) {
  const dsl = await getDsl(tsConfigPath, pattern);
  console.log(dsl);
  return await download(dsl);
}

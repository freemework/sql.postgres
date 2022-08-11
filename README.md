# Freemework

[Freemework](https://docs.freemework.org) is a general purposes framework with goal to provide cross language API. Learn API once - develop for any programming language.

## Freemework SQL Postgres Library

This is workspace branch of **Freemework SQL Postgres Library** multi project repository based on [orphan](https://git-scm.com/docs/git-checkout#Documentation/git-checkout.txt---orphanltnew-branchgt) branches.

Branches (sub-projects):

* `docs` - Sources of library [documentation](https://docs.freemework.org/sql.postgres).
* `src-csharp` - C# Sources
* `src-dart` - Dart Sources
* `src-python` - Python Sources
* `src-typescript` - TypeScript Sources

## Get Started

```shell
git clone git@github.com:freemework/sql.postgres.git freemework.sql.postgres
cd freemework.sql.postgres
for BRANCH in docs src-csharp src-dart src-python src-typescript; do git worktree add "${BRANCH}" "${BRANCH}"; done
code "Freemework-Sql.Postgres.code-workspace"
```

## Developer Notes

### Hints

Setup new repository (for new branches)

```shell
for BRANCH in docs src-csharp src-dart src-python src-typescript; do
    git switch --orphan  "${BRANCH}"
    git commit --allow-empty -m "Initial Commit"
    git push origin "${BRANCH}"
done
git switch workspace
```
# PRD-based development workflow

## Working approach

Use a lightweight Agile approach: implement the PRD one function at a time, deliver working increments, and review them with the team regularly. Use a Kanban board to track progress and a weekly planning and demo session. Formal Scrum ceremonies are optional; start with this simpler process.

Each function should deliver a complete, testable user outcome across Next.js, Flask, and the database where needed. Split large functions into smaller outcomes rather than completing the entire backend before starting the frontend.

The PRD defines scope. Examples in this document illustrate the process and do not introduce additional requirements.

## Progress stages and required work

Move each function through these board columns:

| Progress | Work required | Completion criteria |
| --- | --- | --- |
| Backlog | Link the function to a PRD requirement ID. Describe the user outcome, priority, and dependencies. Record unanswered questions. | An issue exists and the team understands its purpose. |
| Refinement | Confirm business rules, user roles, required fields, validation, and acceptance criteria with the PRD owner. Split oversized work. Identify relevant access and audit requirements. | Scope and acceptance criteria are agreed; blocking questions are resolved. |
| Ready | Agree on UI behavior, API methods and paths, request/response schemas, errors, and database changes. Assign an owner and estimate effort. | The function is small enough to implement and its dependencies are available. |
| In progress | Create a feature branch. Implement Flask validation, permissions, and business logic; implement Next.js forms and screens; add migrations when necessary. Connect the frontend to the API. Add tests appropriate to the behavior. | Implementation works locally against the acceptance criteria, including relevant error cases. |
| Review | Open a pull request linked to the issue and PRD requirement. Describe the change and validation. A teammate reviews code, API consistency, and data handling. Resolve feedback and pass automated checks. | The pull request is approved and required checks pass. |
| Validation | Merge the reviewed change and deploy it to staging. Demonstrate the complete workflow using synthetic data. The PRD owner checks acceptance criteria and records the result. | Acceptance is recorded, with no unresolved defects that prevent the function from meeting its criteria. |
| Done | Update API documentation, setup notes, and the issue. Confirm migrations and any release instructions are documented. | The definition of done is met. Production release is tracked separately if needed. |

If work is blocked, flag the issue with the reason, responsible person, and next action. Keep its current stage visible. Return rejected work to the appropriate stage and record what needs to change.

## Issue template for each function

```text
Title: MCU-XXX — Function name
PRD reference: Requirement ID and link/section
User outcome: Who needs to do what, and why?
Owner:
Reviewer:
Priority:
Dependencies:

Acceptance criteria:
- Given ..., when ..., then ...
- Invalid input behavior:
- Unauthorized access behavior, where relevant:

Implementation tasks:
- [ ] Confirm UI and API contract
- [ ] Implement Flask behavior
- [ ] Implement database changes/migrations, if needed
- [ ] Implement Next.js interface
- [ ] Integrate frontend and backend
- [ ] Verify acceptance criteria and relevant failure cases
- [ ] Complete pull request review
- [ ] Demonstrate and accept on staging
- [ ] Update relevant documentation

Blockers / open questions:
Validation evidence:
```

For example, if patient registration is in the PRD, implement registration as a complete increment: form, API, validation, storage, and confirmation. Implement other patient functions as separate issues when they are independently useful and testable.

## Team rhythm

1. **Weekly planning:** Review PRD priorities, refine upcoming functions, and select a realistic amount of work. Start with one active function per developer or pair.
2. **Brief daily update:** State completed work, the next action, and blockers. This can be asynchronous in the issue board.
3. **Continuous review:** Review small pull requests promptly so work does not accumulate in the Review column.
4. **Weekly demo:** Show working functions on staging and collect acceptance or specific feedback from the PRD owner.
5. **Short retrospective:** Identify one improvement to the team's process for the next week.

Track accepted functions, work in progress, blockers, and time spent waiting for review. Report progress against acceptance criteria rather than subjective percentages.

## Git and verification

- Keep `main` usable and protect it with required review and checks.
- Use short branches such as `feat/MCU-001-patient-registration` or `fix/MCU-001-validation`.
- Keep related frontend, backend, migration, and API changes together in a reviewable pull request.
- Run backend tests for changed business rules and API behavior. Run frontend lint, type checks, and build checks; test important interactions as appropriate.
- Verify critical user journeys end to end, including relevant validation and permission failures.
- Use synthetic development and staging records. Keep credentials, patient records, uploads, and database dumps outside Git.

## Definition of done

A function is done when:

- Its agreed PRD acceptance criteria pass.
- The frontend and backend work together on staging.
- Backend validation and required permissions are enforced.
- Relevant tests and required automated checks pass.
- A teammate has approved the pull request.
- Required migrations, API documentation, and run instructions are updated.
- The PRD owner has recorded acceptance.

## Handling requirement changes

Record new requests and changed rules in the PRD or its change log. Assess their impact on the API, data, UI, and existing functions before implementation. Update linked issues and acceptance criteria, then reprioritize with the team. Keep scope changes visible rather than adding them silently to active work.

## Initial project milestone

Before implementing the first PRD function, complete a small setup milestone:

- [ ] Flask health endpoint works.
- [ ] Next.js runs and reaches Flask through the configured API route.
- [ ] `.gitignore` and non-secret environment examples are committed.
- [ ] README explains installation and local run commands.
- [ ] Team agrees on runtime versions and dependency installation.
- [ ] PRD location, issue board, reviewers, and acceptance owner are agreed.
- [ ] Basic automated checks are configured.
- [ ] Database choice and staging approach are agreed before functions need them.

Then select the first PRD function and move it through the stages above.

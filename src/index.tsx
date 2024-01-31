import { html } from "@elysiajs/html";
import { Elysia, t } from "elysia";
import * as elements from "typed-html";
import { db } from "./db";
import { todos } from "./db/schema";
import { eq } from "drizzle-orm";

const app = new Elysia()
  .use(html())
  .get("/", ({ html }) =>
    html(
      <BaseHtml>
        <body
          class="flex w-full h-screen justify-center items-center"
          hx-get="/todos"
          hx-swap="inner-HTML"
          hx-trigger="load"
        />
      </BaseHtml>
    )
  )
  .get("/todos", async () => {
    const data = await db.select().from(todos).all();
    console.log("test!");
    return <TodoList todos={data} />;
  })
  .post(
    "/todos/:id",
    async ({ params }) => {
      const oldTodo = await db
        .select()
        .from(todos)
        .where(eq(todos.id, params.id))
        .get();
      if (oldTodo) {
        const newTodo = await db
          .update(todos)
          .set({ completed: !oldTodo.completed })
          .where(eq(todos.id, params.id))
          .returning()
          .get();
        return <TodoItem todo={newTodo} />;
      }
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .delete(
    "/todos/:id",
    ({ params }) => {
      db.delete(todos).where(eq(todos.id, params.id)).run();
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .post(
    "/todos",
    async ({ body }) => {
      if (body.title.length === 0) {
        throw new Error("Title can't be empty");
      }

      const newTodo = await db
        .insert(todos)
        .values({ title: body.title, completed: false })
        .returning()
        .get();

      return <TodoItem todo={newTodo} />;
    },
    {
      body: t.Object({
        title: t.String(),
      }),
    }
  )
  .get("/styles.css", () => Bun.file("./tailwind-gen/styles.css"))
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at https://${app.server?.hostname}:${app.server?.port}`
);

const BaseHtml = ({ children }: JSX.HtmlBodyTag) => `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Elysia App</title>
  <script src="https://unpkg.com/htmx.org@1.9.3"></script>
  <script src="https://unpkg.com/hyperscript.org@0.9.12"></script>
  <link href="/styles.css" rel="stylesheet">
</head>

${children}
`;

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

function TodoItem({ todo }: { todo: Todo }) {
  return (
    <div class="grid grid-cols-3 mt-2 w-full">
      <span>{todo.title}</span>
      <input
        type="checkbox"
        checked={todo.completed}
        hx-post={`/todos/${todo.id}`}
        hx-swap="outerHTML"
        hx-target="closest div"
      />
      <button
        class="text-red-500"
        hx-delete={`/todos/${todo.id}`}
        hx-swap="outerHTML"
        hx-target="closest div"
      >
        X
      </button>
    </div>
  );
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div>
      {todos.map((todo) => (
        <TodoItem todo={todo} />
      ))}
      <TodoForm />
    </div>
  );
}

function TodoForm() {
  return (
    <form
      class="flex flex-row space-x-3 mt-2"
      hx-post="/todos"
      hx-swap="beforebegin"
      _="on submit target.reset()"
    >
      <input type="text" name="title" class="border border-black" />
      <button type="submit">Add</button>
    </form>
  );
}

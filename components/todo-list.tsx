"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      id: "1",
      text: "Check RRC connection failure in Call ID CALL-001",
      completed: false,
    },
    {
      id: "2",
      text: "Analyze HARQ feedback errors in Cell ID CELL-A123",
      completed: true,
    },
    {
      id: "3",
      text: "Review S1AP authentication issues",
      completed: false,
    },
    {
      id: "4",
      text: "Debug PDCP data transfer in Call ID CALL-002",
      completed: false,
    },
  ])
  const [newTodo, setNewTodo] = useState("")

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([
        ...todos,
        {
          id: Date.now().toString(),
          text: newTodo,
          completed: false,
        },
      ])
      setNewTodo("")
    }
  }

  const toggleTodo = (id: string) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)))
  }

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">To-Do List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Add a task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodo()
              }
            }}
          />
          <Button size="icon" onClick={addTodo}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-300px)] pr-4">
          <div className="space-y-2">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center justify-between rounded-md border p-3 ${
                  todo.completed ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`text-sm ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {todo.text}
                  </label>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTodo(todo.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

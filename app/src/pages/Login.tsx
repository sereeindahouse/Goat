import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

export default function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: async (user) => {
      utils.auth.me.setData(undefined, user);
      await utils.auth.me.invalidate();
      navigate("/");
    },
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: async (user) => {
      utils.auth.me.setData(undefined, user);
      await utils.auth.me.invalidate();
      navigate("/");
    },
  });
  const mutation = mode === "login" ? login : register;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{mode === "login" ? "Нэвтрэх" : "Бүртгэл үүсгэх"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
            <Button type="button" variant={mode === "login" ? "default" : "ghost"} onClick={() => { setMode("login"); mutation.reset(); }}>
              Нэвтрэх
            </Button>
            <Button type="button" variant={mode === "register" ? "default" : "ghost"} onClick={() => { setMode("register"); mutation.reset(); }}>
              Бүртгүүлэх
            </Button>
          </div>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (mode === "login") login.mutate({ email, password });
            else register.mutate({ email, name, password });
          }}>
            {mode === "register" && <div className="space-y-2">
              <Label htmlFor="name">Нэр</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>}
            <div className="space-y-2">
              <Label htmlFor="email">Имэйл</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Нууц үг</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
            </div>
            {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Түр хүлээнэ үү…" : mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

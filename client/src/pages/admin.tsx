
import { usePairs, useUpdatePair } from "@/hooks/use-pairs";
import { useUsers, useBlockUser } from "@/hooks/use-admin-users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { data: pairs } = usePairs();
  const { mutate: updatePair } = useUpdatePair();
  const { data: users } = useUsers();
  const { mutate: blockUser } = useBlockUser();
  const { toast } = useToast();

  const handleTogglePair = (id: number, isEnabled: boolean) => {
    updatePair({ id, isEnabled });
    toast({ title: "Updated", description: `Pair ${isEnabled ? 'enabled' : 'disabled'}` });
  };

  const handleBlockUser = (id: number, isBlocked: boolean) => {
    blockUser({ id, isBlocked });
    toast({ title: "Updated", description: `User ${isBlocked ? 'blocked' : 'unblocked'}` });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Admin Control Panel</h2>
      
      <Tabs defaultValue="pairs">
        <TabsList>
          <TabsTrigger value="pairs">Pairs Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pairs">
          <Card>
            <CardHeader>
              <CardTitle>OTC Pairs</CardTitle>
              <CardDescription>Manage available trading pairs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Payout %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairs?.map((pair: any) => (
                    <TableRow key={pair.id}>
                      <TableCell className="font-bold">{pair.symbol}</TableCell>
                      <TableCell>{pair.name}</TableCell>
                      <TableCell>{pair.payout}%</TableCell>
                      <TableCell>
                        <Switch 
                          checked={pair.isEnabled} 
                          onCheckedChange={(c) => handleTogglePair(pair.id, c)} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.isBlocked ? "Blocked" : "Active"}</TableCell>
                      <TableCell>
                        <Button 
                          variant={user.isBlocked ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => handleBlockUser(user.id, !user.isBlocked)}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

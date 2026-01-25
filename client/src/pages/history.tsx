
import { useSignals } from "@/hooks/use-signals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function HistoryPage() {
  const { data: signals, isLoading } = useSignals({ status: 'closed', limit: 50 });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Signal History</h2>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="py-10 text-center">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Close</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals?.map((signal: any) => (
                  <TableRow key={signal.id}>
                    <TableCell>{format(new Date(signal.closeTime), 'PP p')}</TableCell>
                    <TableCell className="font-medium">{signal.pair?.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={signal.direction === 'UP' ? 'outline' : 'secondary'} className={signal.direction === 'UP' ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'}>
                        {signal.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>{signal.openPrice}</TableCell>
                    <TableCell>{signal.closePrice}</TableCell>
                    <TableCell>
                      <Badge variant={signal.result === 'WIN' ? 'default' : 'destructive'}>
                        {signal.result}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

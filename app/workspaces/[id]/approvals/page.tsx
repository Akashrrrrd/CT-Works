'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface Approval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  comments?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  computation: {
    id: string;
    templateName: string;
    verdict: string;
    ealreq_max: number;
    vk_required: number;
    vk_available: number;
    sheet1: Record<string, number | string>;
    createdBy: { name: string };
    createdAt: string;
  } | null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED') return <Badge className="bg-green-700 gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
  if (status === 'REJECTED') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge className="bg-yellow-600 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

export default function ApprovalsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/approvals`);
    const data = await res.json();
    setApprovals(data);
    setLoading(false);
  };

  useEffect(() => { fetchApprovals(); }, [workspaceId]);

  const handleApprove = async (approvalId: string) => {
    setSubmitting(true);
    await fetch(`/api/workspaces/${workspaceId}/approvals/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, comments }),
    });
    setComments('');
    setOpenId(null);
    setSubmitting(false);
    fetchApprovals();
  };

  const handleReject = async (approvalId: string) => {
    if (!comments.trim()) return;
    setSubmitting(true);
    await fetch(`/api/workspaces/${workspaceId}/approvals/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, comments }),
    });
    setComments('');
    setOpenId(null);
    setSubmitting(false);
    fetchApprovals();
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Approval Workflows</h2>
        <p className="text-muted-foreground">Review and approve CT adequacy computations</p>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No approvals yet</p>
            <p className="text-sm text-muted-foreground">Run a computation to generate an approval request</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {approvals.map(apr => {
            const comp = apr.computation;
            const isSuitable = comp?.verdict === 'SUITABLY DIMENSIONED';
            return (
              <Dialog key={apr.id} open={openId === apr.id} onOpenChange={open => { setOpenId(open ? apr.id : null); setComments(''); }}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={apr.status} />
                            <span className="font-medium text-sm">{comp?.templateName ?? 'Unknown'}</span>
                          </div>
                          {comp && (
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Ealreq: <span className="font-mono text-foreground">{comp.ealreq_max} V</span></span>
                              <span>Vk Required: <span className="font-mono text-foreground">{comp.vk_required} V</span></span>
                              <span>Vk Available: <span className="font-mono text-foreground">{comp.vk_available} V</span></span>
                            </div>
                          )}
                          {comp && (
                            <Badge variant="outline" className={`text-xs w-fit ${isSuitable ? 'border-green-700 text-green-400' : 'border-red-700 text-red-400'}`}>
                              {isSuitable ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                              {comp.verdict}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            By {comp?.createdBy.name} · {new Date(apr.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>

                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{comp?.templateName}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Verdict */}
                    {comp && (
                      <div className={`rounded-lg p-4 border ${isSuitable ? 'border-green-700 bg-green-950/30' : 'border-red-700 bg-red-950/30'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          {isSuitable ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
                          <span className={`font-bold ${isSuitable ? 'text-green-400' : 'text-red-400'}`}>{comp.verdict}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-background/50 rounded p-2">
                            <p className="text-xs text-muted-foreground">Ealreq</p>
                            <p className="font-bold">{comp.ealreq_max} V</p>
                          </div>
                          <div className="bg-background/50 rounded p-2">
                            <p className="text-xs text-muted-foreground">Vk Required</p>
                            <p className="font-bold">{comp.vk_required} V</p>
                          </div>
                          <div className="bg-background/50 rounded p-2">
                            <p className="text-xs text-muted-foreground">Vk Available</p>
                            <p className="font-bold">{comp.vk_available} V</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CT Parameters */}
                    {comp?.sheet1 && (
                      <div>
                        <p className="text-sm font-medium mb-2">CT Parameters</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-muted-foreground">CT Ratio</span>
                          <span className="font-mono">{comp.sheet1.ct_ratio_primary}/{comp.sheet1.ct_ratio_secondary} A</span>
                          <span className="text-muted-foreground">Class</span>
                          <span className="font-mono">{comp.sheet1.accuracy_class}</span>
                          <span className="text-muted-foreground">Rct</span>
                          <span className="font-mono">{comp.sheet1.rct} Ω</span>
                          <span className="text-muted-foreground">Vk Available</span>
                          <span className="font-mono">{comp.sheet1.vk_available} V</span>
                        </div>
                      </div>
                    )}

                    {/* Already resolved */}
                    {apr.status !== 'PENDING' && (
                      <div className="bg-muted rounded p-3 text-sm space-y-1">
                        <p><span className="text-muted-foreground">Decision:</span> <span className="font-medium">{apr.status}</span></p>
                        {apr.reviewedBy && <p><span className="text-muted-foreground">By:</span> {apr.reviewedBy}</p>}
                        {apr.reviewedAt && <p><span className="text-muted-foreground">At:</span> {new Date(apr.reviewedAt).toLocaleString()}</p>}
                        {apr.comments && <p><span className="text-muted-foreground">Comments:</span> {apr.comments}</p>}
                      </div>
                    )}

                    {/* Action */}
                    {apr.status === 'PENDING' && (
                      <div className="space-y-3 border-t pt-4">
                        <Textarea
                          value={comments}
                          onChange={e => setComments(e.target.value)}
                          placeholder="Add comments (required for rejection)"
                          className="min-h-20"
                        />
                        <div className="flex gap-2">
                          <Button className="flex-1" disabled={submitting} onClick={() => handleApprove(apr.id)}>
                            Approve
                          </Button>
                          <Button variant="destructive" className="flex-1" disabled={submitting || !comments.trim()} onClick={() => handleReject(apr.id)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      )}
    </div>
  );
}

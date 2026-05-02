import { getComputations, getTemplates, ObjectId } from '@/lib/db';
import { evaluateFormula } from './formula-engine';

export async function executeComputation(computationId: string) {
  const computations = await getComputations();
  const templates    = await getTemplates();
  const now          = new Date();

  const computation = await computations.findOne({ _id: new ObjectId(computationId) });
  if (!computation) throw new Error('Computation not found');

  const template = await templates.findOne({ _id: computation.templateId });
  if (!template) throw new Error('Template not found');

  await computations.updateOne(
    { _id: new ObjectId(computationId) },
    { $set: { status: 'EXECUTING', updatedAt: now } }
  );

  try {
    const context = computation.inputData as Record<string, number | string>;
    const result  = evaluateFormula(template.formula, context);

    await computations.updateOne(
      { _id: new ObjectId(computationId) },
      { $set: { status: 'COMPLETED', outputData: { result }, updatedAt: now } }
    );

    return { id: computationId, status: 'COMPLETED', outputData: { result } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    await computations.updateOne(
      { _id: new ObjectId(computationId) },
      { $set: { status: 'FAILED', error: msg, updatedAt: now } }
    );
    throw error;
  }
}

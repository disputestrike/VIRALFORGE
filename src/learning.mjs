export function scoreTopic(topic) {
  const text = `${topic.topic || ""} ${topic.pillar || ""}`.toLowerCase();
  let score = Number(topic.score || 50);
  if (/hack|wrong|secret|why|rank|top|satisfying|mystery|poll/.test(text)) score += 8;
  if (/medical|legal|election|war|violence|finance advice/.test(text)) score -= 25;
  return Math.max(0, Math.min(100, score));
}

export async function updateRecursiveLearning({ repo, run, posts }) {
  const runScore = Number(run.score || 70);
  const simulated = posts.map((post, index) => ({
    platform: post.platform,
    views: Math.round(runScore * 100 + index * 37),
    likes: Math.round(runScore * 3 + index * 2),
    comments: Math.round(runScore * 0.7 + index),
    shares: Math.round(runScore * 0.9 + index),
    saves: Math.round(runScore * 0.5 + index),
    revenue: Number((runScore / 1000).toFixed(2)),
    metadata: {
      source: "local_recursive_learning_evaluation",
      note: "Real platform analytics replace this automatically when connector credentials are present.",
    },
  }));

  for (const metric of simulated) {
    await repo.addAnalytic({
      post_id: posts.find(post => post.platform === metric.platform)?.id,
      run_id: run.id,
      ...metric,
    });
  }

  const best = simulated.sort((a, b) => (b.views + b.shares * 20) - (a.views + a.shares * 20))[0];
  await repo.upsertLearning({
    key: `platform:${best.platform}:weight`,
    value: best.platform,
    weight: Math.min(2, 1 + best.views / 10000),
    metadata: {
      reason: "Best local evaluation outcome in latest run.",
      runId: run.id,
      recursiveLearning: true,
    },
  });

  await repo.upsertLearning({
    key: `pillar:${run.output?.brief?.pillar || "curiosity"}:weight`,
    value: run.output?.brief?.pillar || "curiosity",
    weight: Math.min(2, 1 + runScore / 100),
    metadata: {
      reason: "Pipeline score reinforced this pillar.",
      runId: run.id,
      recursiveLearning: true,
    },
  });

  return simulated;
}

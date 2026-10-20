"use client";

// One panel for message search, kind/rating filters and records; full messages stay in the DetailPane.
import { useState } from "react";
import { Block } from "@/components/frame";
import { TableFilters } from "@/components/table-filters";
import {
  type Column, DetailEmpty, DetailHead, RecordTable, RowAction, Rows, Status, StatusFilter, WorkPanel, countOptions,
} from "@/components/roles/kit";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal } from "@/content";
import { type Feedback, type FeedbackKind, feedback } from "@/lib/mock-records";

const kinds: readonly FeedbackKind[] = ["Ulasan", "Aduan"];
const copy = internal.management.feedback;
const common = internal.common;
const stars = (rating: number) => <span className="ws-stars" role="img" aria-label={copy.stars(rating)}><span aria-hidden="true">{"★".repeat(rating)}<span className="ws-stars-off">{"★".repeat(5 - rating)}</span></span></span>;
const ratings = feedback.map((item) => item.rating);
const averageRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "—";

export function ManagementFeedback() {
  const [rating, setRating] = useState("");
  const [kind, setKind] = useState<FeedbackKind | "">("");
  const [search, setSearch] = useState("");
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(feedback[0]?.id ?? null);
  const query = search.trim().toLocaleLowerCase("id");
  const searched = feedback.filter((item) => `${item.message} ${item.date}`.toLocaleLowerCase("id").includes(query));
  const byRating = searched.filter((item) => !rating || item.rating === Number(rating));
  const rows = byRating.filter((item) => !kind || item.kind === kind);
  const current = rows.find((item) => item.id === selected) ?? null;
  const col = copy.list.columns;
  const columns: Column<Feedback>[] = [
    { label: col.date, kind: "title", cell: (item) => item.date },
    { label: col.kind, compact: true, cell: (item) => <Status>{item.kind}</Status> },
    { label: col.rating, compact: true, cell: (item) => stars(item.rating) },
    { label: col.message, kind: "text", cell: (item) => <span className="ws-clamp">{item.message}</span> },
    { label: common.action, kind: "action", cell: (item) => <RowAction label={copy.list.viewLabel(item.kind, item.date)} current={item.id === selected} onClick={() => select(item.id)}>{common.actions.view}</RowAction> },
  ];

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="feedback-list" title={copy.list.title} description={copy.list.average(averageRating)}
        tools={<TableFilters search={search} onSearch={(value) => { setSearch(value); closeSheet(); }} placeholder={common.table.searchFeedback}
          status={kind} onStatus={(value) => { setKind(value); closeSheet(); }} filterLabel={copy.list.kind}
          options={countOptions(byRating, kinds, (item) => item.kind, common.all)} count={rows.length}
          hasFilters={Boolean(search || kind || rating)} onReset={() => { setSearch(""); setKind(""); setRating(""); closeSheet(); }}
          extraFilters={<StatusFilter legend={copy.list.rating} name="feedback-rating" value={rating}
            onChange={(value) => { setRating(value); closeSheet(); }} options={[
              { value: "", label: copy.list.allRatings },
              ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: copy.list.ratingOption(n) })),
            ]} />} />}>
        <RecordTable labelledBy="feedback-list" rows={rows} columns={columns} rowKey={(item) => item.id} selected={selected}
          empty={search || kind || rating ? common.table.noMatch : copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current ? <DetailEmpty headingRef={headingRef} title={copy.detail.emptyTitle} hint={copy.detail.emptyHint} /> : <>
        <DetailHead headingRef={headingRef} title={`${current.kind} ${current.id}`} status={current.kind} />
        <Rows items={[[copy.detail.rows.date, current.date], [copy.detail.rows.rating, stars(current.rating)]]} />
        <p className="ws-message">{current.message}</p>
        <p className="ws-hint">{copy.detail.senderNote}</p>
      </>}
    </DetailPane>
  </>;
}

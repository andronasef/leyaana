import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ContentType,
  NamedContent,
  Verse,
  createContent,
  deleteContent,
  flushPendingMutations,
  getPendingMutationCount,
  getGodNames,
  getHeavenlyBlessings,
  getVerses,
  subscribePendingMutations,
  updateContent,
} from "../utils/api";

type Item = Verse | NamedContent;

type FieldName = "title" | "verse" | "name" | "mean" | "content" | "order";

type FieldConfig = {
  name: FieldName;
  label: string;
  required?: boolean;
  multiline?: boolean;
  minRows?: number;
  type?: "text" | "number";
};

type ManagerConfig = {
  title: string;
  description: string;
  fields: FieldConfig[];
  fetchItems: () => Promise<Item[]>;
  preview: (item: Item) => string;
  secondary: (item: Item) => string;
};

type ContentManagerProps = {
  type: ContentType;
  onChanged?: (type: ContentType) => void;
};

type FormState = Record<FieldName, string>;

type ChangeSummary = {
  action: "create" | "update" | "delete";
  label: string;
  beforeCount: number;
  afterCount: number;
};

const emptyForm: FormState = {
  title: "",
  verse: "",
  name: "",
  mean: "",
  content: "",
  order: "0",
};

const managerConfigs: Record<ContentType, ManagerConfig> = {
  verse: {
    title: "الآيات",
    description: "إدارة الآيات المعروضة في التطبيق.",
    fields: [
      { name: "title", label: "العنوان (اختياري)" },
      {
        name: "verse",
        label: "نص الآية",
        required: true,
        multiline: true,
        minRows: 4,
      },
      { name: "order", label: "الترتيب", type: "number" },
    ],
    fetchItems: async () => (await getVerses()) as Item[],
    preview: (item) => ("verse" in item ? item.verse : ""),
    secondary: (item) =>
      "title" in item && item.title ? item.title : "بدون عنوان",
  },
  godName: {
    title: "أسماء الله",
    description: "إدارة أسماء الله ومعانيها والمحتوى التفصيلي.",
    fields: [
      { name: "name", label: "الاسم", required: true },
      { name: "mean", label: "المعنى" },
      { name: "content", label: "المحتوى", multiline: true, minRows: 6 },
      { name: "order", label: "الترتيب", type: "number" },
    ],
    fetchItems: async () => (await getGodNames()) as Item[],
    preview: (item) => ("content" in item && item.content ? item.content : ""),
    secondary: (item) =>
      "mean" in item && item.mean ? item.mean : "بدون معنى",
  },
  heavenlyBlessing: {
    title: "البركات السماوية",
    description: "إدارة البركات والسياق المرتبط بها.",
    fields: [
      { name: "name", label: "اسم البركة", required: true },
      { name: "mean", label: "الآية أو الملخص" },
      { name: "content", label: "المحتوى", multiline: true, minRows: 6 },
      { name: "order", label: "الترتيب", type: "number" },
    ],
    fetchItems: async () => (await getHeavenlyBlessings()) as Item[],
    preview: (item) => ("content" in item && item.content ? item.content : ""),
    secondary: (item) =>
      "mean" in item && item.mean ? item.mean : "بدون ملخص",
  },
};

function truncate(value: string, limit = 220) {
  if (!value) {
    return "";
  }
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}...`;
}

function toForm(item: Item): FormState {
  return {
    title: "title" in item && typeof item.title === "string" ? item.title : "",
    verse: "verse" in item && typeof item.verse === "string" ? item.verse : "",
    name: "name" in item && typeof item.name === "string" ? item.name : "",
    mean: "mean" in item && typeof item.mean === "string" ? item.mean : "",
    content:
      "content" in item && typeof item.content === "string" ? item.content : "",
    order: typeof item.order === "number" ? String(item.order) : "0",
  };
}

function buildPayload(type: ContentType, form: FormState) {
  const orderValue = Number(form.order);
  const order = Number.isFinite(orderValue) ? orderValue : 0;

  if (type === "verse") {
    const payload: Record<string, string | number> = {
      verse: form.verse.trim(),
      order,
    };

    if (form.title.trim()) {
      payload.title = form.title.trim();
    }

    return payload;
  }

  const payload: Record<string, string | number> = {
    name: form.name.trim(),
    order,
  };

  if (form.mean.trim()) {
    payload.mean = form.mean.trim();
  }

  if (form.content.trim()) {
    payload.content = form.content.trim();
  }

  return payload;
}

function getLabelFromForm(type: ContentType, form: FormState) {
  if (type === "verse") {
    const title = form.title.trim();
    if (title) {
      return title;
    }

    const verseText = form.verse.trim();
    if (!verseText) {
      return "عنصر";
    }

    return truncate(verseText, 36);
  }

  const name = form.name.trim();
  return name || "عنصر";
}

function getLabelFromItem(item: Item) {
  if ("name" in item && item.name) {
    return item.name;
  }

  if ("title" in item && item.title) {
    return item.title;
  }

  if ("verse" in item && item.verse) {
    return truncate(item.verse, 36);
  }

  return "عنصر";
}

function getChangeMessage(change: ChangeSummary) {
  if (change.action === "create") {
    return `تمت إضافة "${change.label}". العدد: ${change.beforeCount} → ${change.afterCount}`;
  }

  if (change.action === "delete") {
    return `تم حذف "${change.label}". العدد: ${change.beforeCount} → ${change.afterCount}`;
  }

  return `تم تحديث "${change.label}".`;
}

export default function ContentManager({
  type,
  onChanged,
}: ContentManagerProps) {
  const config = useMemo(() => managerConfigs[type], [type]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [lastChange, setLastChange] = useState<ChangeSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(getPendingMutationCount());

  const loadItems = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await config.fetchItems();
      setItems(data);
      return data;
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "تعذر تحميل البيانات.",
      );
      return [] as Item[];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(emptyForm);
    setEditingId(null);
    setLastChange(null);
    void loadItems();
  }, [type]);

  useEffect(() => {
    setPendingCount(getPendingMutationCount());

    return subscribePendingMutations(() => {
      setPendingCount(getPendingMutationCount());
    });
  }, []);

  const onFieldChange = (field: FieldName, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (type === "verse" && !form.verse.trim()) {
      toast.error("نص الآية مطلوب.");
      return;
    }

    if (type !== "verse" && !form.name.trim()) {
      toast.error("الاسم مطلوب.");
      return;
    }

    const payload = buildPayload(type, form);
    const beforeCount = items.length;
    const changedLabel = getLabelFromForm(type, form);
    setSubmitting(true);

    try {
      const response = editingId
        ? await updateContent({
            id: editingId,
            type,
            data: payload,
          })
        : await createContent(type, payload);

      if (editingId) {
        toast.success(
          response.queued
            ? "تم حفظ التعديل محليًا وسيتم مزامنته عند الاتصال."
            : "تم تحديث المحتوى.",
        );
      } else {
        toast.success(
          response.queued
            ? "تمت الإضافة محليًا وسيتم رفعها تلقائيًا عند عودة الإنترنت."
            : "تمت إضافة المحتوى.",
        );
      }

      resetForm();
      const updatedItems = await loadItems();
      setLastChange({
        action: editingId ? "update" : "create",
        label: changedLabel,
        beforeCount,
        afterCount: updatedItems.length,
      });
      onChanged?.(type);
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء الحفظ.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditingId(item._id);
    setForm(toForm(item));
  };

  const removeItem = async (id: string) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا العنصر؟");
    if (!confirmed) {
      return;
    }

    const beforeCount = items.length;
    const itemToDelete = items.find((item) => item._id === id);
    const deletedLabel = itemToDelete ? getLabelFromItem(itemToDelete) : "عنصر";

    setSubmitting(true);
    try {
      const response = await deleteContent(id, type);
      toast.success(
        response.queued
          ? "تم تسجيل الحذف محليًا وسيتم تطبيقه عند عودة الإنترنت."
          : "تم حذف العنصر.",
      );
      if (editingId === id) {
        resetForm();
      }
      const updatedItems = await loadItems();
      setLastChange({
        action: "delete",
        label: deletedLabel,
        beforeCount,
        afterCount: updatedItems.length,
      });
      onChanged?.(type);
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error ? deleteError.message : "فشل الحذف.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const syncPendingNow = async () => {
    setSubmitting(true);
    try {
      const result = await flushPendingMutations();

      if (result.processed > 0) {
        toast.success(`تمت مزامنة ${result.processed} عملية بنجاح.`);
      }

      if (result.remaining > 0) {
        toast.error(
          "بعض العمليات ما زالت معلقة. تأكد من الاتصال وحاول مرة أخرى.",
        );
      }

      if (result.processed === 0 && result.remaining === 0) {
        toast.success("لا توجد عمليات معلقة.");
      }

      await loadItems();
    } catch (syncError) {
      toast.error(
        syncError instanceof Error ? syncError.message : "فشلت المزامنة.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {config.title}
        </Typography>
        <Typography color="text.secondary">{config.description}</Typography>
      </Box>

      <Box
        component="form"
        onSubmit={submit}
        sx={{
          p: 2,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Stack spacing={2}>
          {config.fields.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              value={form[field.name]}
              required={Boolean(field.required)}
              multiline={Boolean(field.multiline)}
              minRows={field.minRows}
              type={field.type || "text"}
              onChange={(event) =>
                onFieldChange(field.name, event.target.value)
              }
              fullWidth
            />
          ))}

          <Stack direction="row" spacing={1}>
            <Button type="submit" disabled={submitting} variant="contained">
              {editingId ? "حفظ التعديل" : "إضافة"}
            </Button>
            {editingId ? (
              <Button
                type="button"
                disabled={submitting}
                variant="outlined"
                onClick={resetForm}
              >
                إلغاء التعديل
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {loading ? (
        <Box className="flex justify-center p-10">
          <CircularProgress />
        </Box>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      {lastChange ? (
        <Alert severity="success">{getChangeMessage(lastChange)}</Alert>
      ) : null}

      {pendingCount > 0 ? (
        <Alert
          severity="warning"
          action={
            <Button
              size="small"
              disabled={submitting}
              onClick={() => void syncPendingNow()}
            >
              مزامنة الآن
            </Button>
          }
        >
          يوجد {pendingCount} عملية معلقة بسبب وضع offline، وسيتم إرسالها
          تلقائيًا عند عودة الإنترنت.
        </Alert>
      ) : null}

      {!loading && !error ? (
        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item._id} variant="outlined">
              <CardContent>
                <Typography variant="h6" fontWeight={700}>
                  {"name" in item ? item.name : item.title || "بدون عنوان"}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-wrap", mt: 1 }}
                >
                  {config.secondary(item)}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ whiteSpace: "pre-wrap", mt: 2 }}
                >
                  {truncate(config.preview(item))}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => startEdit(item)}>
                  تعديل
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeItem(item._id)}
                >
                  حذف
                </Button>
              </CardActions>
            </Card>
          ))}

          {items.length === 0 ? (
            <Alert severity="info">لا توجد عناصر حتى الآن.</Alert>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}

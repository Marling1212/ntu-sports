# 載入狀態組件使用指南

## 組件列表

### 1. LoadingSpinner
用於顯示載入中的旋轉動畫。

```tsx
import LoadingSpinner from "@/components/LoadingSpinner";

// 基本使用
<LoadingSpinner />

// 自訂大小
<LoadingSpinner size="sm" />  // 小
<LoadingSpinner size="md" />  // 中（預設）
<LoadingSpinner size="lg" />  // 大

// 帶文字
<LoadingSpinner size="lg" text="載入中..." />
```

### 2. SkeletonLoader
用於顯示骨架屏載入效果。

```tsx
import SkeletonLoader from "@/components/SkeletonLoader";

// 文字骨架
<SkeletonLoader lines={3} />

// 卡片骨架
<SkeletonLoader variant="card" />

// 按鈕骨架
<SkeletonLoader variant="button" className="w-32 h-10" />

// 圓形骨架（用於頭像等）
<SkeletonLoader variant="circle" className="w-16 h-16" />
```

### 3. LoadingButton
帶載入狀態的按鈕組件，改善互動回饋。

```tsx
import LoadingButton from "@/components/LoadingButton";

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await submitData();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoadingButton
      isLoading={isLoading}
      loadingText="提交中..."
      variant="primary"
      size="md"
      onClick={handleSubmit}
    >
      提交
    </LoadingButton>
  );
}
```

**變體（variants）:**
- `primary` - 主要按鈕（綠色）
- `secondary` - 次要按鈕（灰色）
- `danger` - 危險操作（紅色）
- `outline` - 外框按鈕

**尺寸（sizes）:**
- `sm` - 小
- `md` - 中（預設）
- `lg` - 大

### 4. LoadingLink
帶載入狀態的連結組件，用於頁面導航。

```tsx
import LoadingLink from "@/components/LoadingLink";

<LoadingLink href="/sports/tennis" className="...">
  查看網球賽事
</LoadingLink>
```

### 5. LoadingProvider & useLoading
全域載入狀態管理。

```tsx
// 在 layout.tsx 中已經設定
import { useLoading } from "@/components/LoadingProvider";

function MyComponent() {
  const { setLoading, setLoadingMessage } = useLoading();

  const handleAction = async () => {
    setLoadingMessage("處理中...");
    setLoading(true);
    try {
      await doSomething();
    } finally {
      setLoading(false);
    }
  };
}
```

## 最佳實踐

### 1. API 請求時顯示載入狀態
```tsx
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState(null);

useEffect(() => {
  async function fetchData() {
    setIsLoading(true);
    try {
      const result = await fetch('/api/data');
      setData(await result.json());
    } finally {
      setIsLoading(false);
    }
  }
  fetchData();
}, []);

if (isLoading) {
  return <LoadingSpinner size="lg" text="載入資料中..." />;
}
```

### 2. 表單提交時使用 LoadingButton
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
    await submitForm();
    toast.success("提交成功！");
  } catch (error) {
    toast.error("提交失敗，請重試");
  } finally {
    setIsSubmitting(false);
  }
};

<LoadingButton
  type="submit"
  isLoading={isSubmitting}
  loadingText="提交中..."
>
  提交表單
</LoadingButton>
```

### 3. 頁面轉換時使用 Next.js loading.tsx
Next.js 會自動在頁面資料載入時顯示 `loading.tsx`。

已建立的 loading.tsx 檔案：
- `app/loading.tsx` - 根頁面載入
- `app/sports/[sport]/loading.tsx` - 運動頁面載入
- `app/sports/[sport]/draw/loading.tsx` - 籤表頁面載入

## 改善的使用者體驗

1. **立即回饋** - 按鈕點擊後立即顯示載入狀態
2. **視覺指示** - 清楚的載入動畫讓用戶知道系統正在處理
3. **防止重複操作** - 載入時按鈕自動禁用
4. **流暢轉換** - 頁面轉換時顯示載入指示器

-- ==========================================
-- 22. OPÉRATIONS ADMINISTRATEUR SYNI (TRAILERS)
-- ==========================================

-- 1. Cascade complète pour hard_delete dans syni_delete_trailer
CREATE OR REPLACE FUNCTION public.syni_delete_trailer(trailer_id_param bigint, hard_delete boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
BEGIN
    IF NOT public.is_syni_admin() THEN
        RAISE EXCEPTION 'Accès refusé. Action réservée aux administrateurs Syni.';
    END IF;

    IF hard_delete THEN
        DELETE FROM public.clicks WHERE trailer_id = trailer_id_param;
        DELETE FROM public.impressions WHERE trailer_id = trailer_id_param;
        DELETE FROM public.messages WHERE trailer_id = trailer_id_param;
        DELETE FROM public.reviews WHERE trailer_id = trailer_id_param;
        DELETE FROM public.inspections WHERE trailer_id = trailer_id_param;
        DELETE FROM public.bookings WHERE trailer_id = trailer_id_param;
        DELETE FROM public.trailers WHERE id = trailer_id_param;
        v_result := json_build_object('success', true, 'action', 'hard_delete', 'trailer_id', trailer_id_param);
    ELSE
        UPDATE public.trailers 
        SET is_deleted = true, is_active = false, deleted_at = now() 
        WHERE id = trailer_id_param;
        v_result := json_build_object('success', true, 'action', 'soft_delete', 'trailer_id', trailer_id_param);
    END IF;

    RETURN v_result;
END;
$$;

-- 2. Fonction RPC dédiée pour basculer l'état actif/masqué
CREATE OR REPLACE FUNCTION public.syni_toggle_trailer_active(trailer_id_param bigint, new_active boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_syni_admin() THEN
        RAISE EXCEPTION 'Accès refusé. Action réservée aux administrateurs Syni.';
    END IF;

    UPDATE public.trailers 
    SET is_active = new_active
    WHERE id = trailer_id_param;

    RETURN json_build_object('success', true, 'action', 'toggle_active', 'trailer_id', trailer_id_param, 'is_active', new_active);
END;
$$;

-- 3. Fonction RPC dédiée pour modification d'une annonce par Syni
CREATE OR REPLACE FUNCTION public.syni_update_trailer_admin(
    trailer_id_param bigint,
    title_param text DEFAULT NULL,
    price_param numeric DEFAULT NULL,
    category_param text DEFAULT NULL,
    location_city_param text DEFAULT NULL,
    payload_param bigint DEFAULT NULL,
    is_active_param boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_syni_admin() THEN
        RAISE EXCEPTION 'Accès refusé. Action réservée aux administrateurs Syni.';
    END IF;

    UPDATE public.trailers 
    SET 
        title = COALESCE(title_param, title),
        price = COALESCE(price_param, price),
        category = COALESCE(category_param, category),
        location_city = COALESCE(location_city_param, location_city),
        payload = COALESCE(payload_param, payload),
        is_active = COALESCE(is_active_param, is_active)
    WHERE id = trailer_id_param;

    RETURN json_build_object('success', true, 'action', 'update_trailer', 'trailer_id', trailer_id_param);
END;
$$;
